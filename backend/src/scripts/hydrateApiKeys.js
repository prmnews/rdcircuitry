require('dotenv').config({ path: '.env.local' });
const { connectToDatabase, getCollection } = require('../lib/db/mongodb');
const Cryptr = require('cryptr');

// Check for encryption key
if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY is not defined in .env.local');
  process.exit(1);
}

// Initialize encryption
const cryptr = new Cryptr(process.env.ENCRYPTION_KEY);

// Define ApiKey Schema (matching src/models/ApiKey.ts)
const ApiKeySchema = {
  apiKey: {
    type: String,
    required: true,
    index: { unique: true }
  },
  userName: {
    type: String,
    required: true,
    index: true,
    ref: 'User'
  },
  apiStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  apiExpireDateTime: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    required: true,
    default: false
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String
  },
  
  // Key rotation fields
  previousKey: {
    type: String
  },
  keyRotationDate: {
    type: Date
  },
  keyRotationReason: {
    type: String
  },
  
  // Audit trail
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String
  },
  modificationHistory: {
    type: Array,
    required: true,
    default: []
  },
  
  // Key metadata
  keyType: {
    type: String,
    enum: ['read-only', 'admin', 'service'],
    required: true,
    default: 'read-only'
  },
  allowedIPs: {
    type: Array,
    required: false,
    default: []
  },
  allowedOrigins: {
    type: Array,
    required: false,
    default: []
  },
  
  // Key lifecycle
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired', 'revoked'],
    required: true,
    default: 'active'
  },
  suspensionReason: {
    type: String
  },
  suspensionDate: {
    type: Date
  }
};

async function hydrateApiKeys() {
  console.log('🔍 Starting API keys hydration script...');

  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  if (!process.env.MONGODB_DB) {
    console.error('❌ MONGODB_DB is not defined in .env.local');
    process.exit(1);
  }

  try {
    // Use centralized connection handler
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using centralized handler');
    
    const apiKeysCollection = await getCollection('apiKeys');
    const usersCollection = await getCollection('users');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    if (users.length === 0) {
      console.error('❌ No users found in database. Please run hydrate:users first.');
      process.exit(1);
    }
    console.log(`✅ Found ${users.length} users to process`);

    // Process each user
    for (const user of users) {
      try {
        // Decrypt the user's API key
        const decryptedApiKey = cryptr.decrypt(user.apiKey);
        
        // Check if API key already exists
        const existingKey = await apiKeysCollection.findOne({ apiKey: decryptedApiKey });
        
        if (!existingKey) {
          // Create new API key entry
          const apiKeyDoc = {
            apiKey: decryptedApiKey,
            userName: user.userName,
            apiStart: new Date(),
            apiExpireDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            isRevoked: false,
            usageCount: 0,
            description: `Initial API key for user ${user.userName}`,
            
            // Key metadata
            keyType: 'read-only',
            status: 'active',
            
            // Audit trail
            createdBy: 'SYSTEM',
            modificationHistory: [{
              timestamp: new Date(),
              action: 'KEY_CREATION',
              performedBy: 'SYSTEM',
              details: 'Initial key creation during hydration'
            }]
          };

          // Validate data format against schema
          const invalidFields = Object.keys(ApiKeySchema).filter(field => {
            const schema = ApiKeySchema[field];
            if (schema.required && !apiKeyDoc[field]) return true;
            if (schema.enum && !schema.enum.includes(apiKeyDoc[field])) return true;
            return false;
          });

          if (invalidFields.length > 0) {
            console.error(`❌ Invalid API key data for user ${user.userName}:`);
            invalidFields.forEach(field => {
              console.error(`   - Missing or invalid field: ${field}`);
            });
            continue;
          }

          await apiKeysCollection.insertOne(apiKeyDoc);
          console.log(`✅ Created API key for user: ${user.userName}`);
        } else {
          console.log(`ℹ️ API key already exists for user: ${user.userName}`);
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.userName}:`, userError);
        // Continue with next user even if one fails
        continue;
      }
    }

    // Verify the insertion by reading back
    const verificationRead = await apiKeysCollection.find({}).toArray();
    console.log('\n📋 API Keys created:');
    verificationRead.forEach(key => {
      console.log(`\n   Key for user: ${key.userName}`);
      console.log(`   - Type: ${key.keyType}`);
      console.log(`   - Status: ${key.status}`);
      console.log(`   - Expires: ${key.apiExpireDateTime.toISOString()}`);
      console.log(`   - Usage Count: ${key.usageCount}`);
      console.log(`   - Document ID: ${key._id}`);
    });

  } catch (error) {
    console.error('\n❌ Error details:');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Name:', error.name);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

// Run the hydration script
hydrateApiKeys().catch(error => {
  console.error('💥 API keys hydration failed:', error);
  process.exit(1);
}); 