// Script to hydrate users collection from JSON data
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const Cryptr = require('cryptr');
const bcrypt = require('bcrypt');
const { connectToDatabase, getUsersCollection } = require('../lib/db/mongodb');

// Check for encryption key
if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY is not defined in .env.local');
  process.exit(1);
}

// Initialize encryption
const cryptr = new Cryptr(process.env.ENCRYPTION_KEY);

// Define User Schema (matching src/models/User.ts)
const UserSchema = {
  userName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  apiKey: {
    type: String,
    required: true,
    set: (value) => cryptr.encrypt(value)
  },
  pinNumber: {
    type: String,
    required: true,
    set: (value) => {
      const salt = bcrypt.genSaltSync(10);
      return bcrypt.hashSync(value, salt);
    }
  },
  location: {
    countryCode: { type: String, required: true },
    countryName: { type: String, required: true },
    timeZone: { type: String, required: true },
    gmtOffset: { type: String, required: true }
  },
  apiKeyMigrated: {
    type: Boolean,
    required: true,
    default: false
  }
};

async function hydrateUsers() {
  console.log('🔍 Starting user hydration script...');

  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  if (!process.env.MONGODB_DB) {
    console.error('❌ MONGODB_DB is not defined in .env.local');
    process.exit(1);
  }

  // Read user data from JSON file
  const jsonPath = path.join(__dirname, 'hydrate_users.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  let userData;
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    userData = JSON.parse(rawData);
    console.log(`✅ Read ${userData.length} users from JSON file`);
  } catch (error) {
    console.error('❌ Failed to parse user data:', error);
    process.exit(1);
  }

  try {
    // Use centralized connection handler
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using centralized handler');
    
    const usersCollection = await getUsersCollection();
    
    // Check if collection has data
    const existingCount = await usersCollection.countDocuments();
    console.log(`\n📊 Current users count: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log(`⚠️ Users collection already has ${existingCount} documents`);
      const confirm = await promptForConfirmation('Do you want to delete existing users and insert new ones? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await usersCollection.deleteMany({});
        console.log('✅ Deleted existing users');
        
        // Verify deletion
        const countAfterDelete = await usersCollection.countDocuments();
        console.log(`📊 Users count after deletion: ${countAfterDelete}`);
      } else {
        console.log('ℹ️ Keeping existing users and adding new ones');
      }
    }
    
    // Insert users
    console.log('\n📝 Inserting users...');
    const insertedUsers = await usersCollection.insertMany(userData.map(user => ({
      ...user,
      apiKeyMigrated: false // Set default value for new field
    })));
    console.log(`✅ MongoDB reports ${insertedUsers.insertedCount} users inserted`);
    
    // Verify the insertion by reading back
    const verificationRead = await usersCollection.find({}).toArray();
    console.log(`\n🔍 Verification read found ${verificationRead.length} users:`);
    verificationRead.forEach(user => {
      console.log(`\n   User: ${user.userName}`);
      console.log(`   - Location: ${user.location.countryName}, ${user.location.timeZone}`);
      console.log(`   - PIN hash exists: ${!!user.pinNumber}`);
      console.log(`   - API key exists: ${!!user.apiKey}`);
      console.log(`   - API Key Migrated: ${user.apiKeyMigrated}`);
      console.log(`   - Document ID: ${user._id}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error details:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Name:', error.name);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Helper function to prompt for confirmation
function promptForConfirmation(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run the hydration script
hydrateUsers().catch(console.error); 