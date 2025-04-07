/**
 * Script to hydrate API keys collection
 * TypeScript version
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../lib/database';
import { ApiKey, User } from '../models';
import { KeyType, KeyStatus } from '../models/apiKey';
import { IApiKey, IUser } from '../types/models';
import mongoose from 'mongoose';
import readline from 'readline';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env' });


// Define API key data interface for hydration
interface ApiKeySeedData {
  userName: string;
  keyType: KeyType;
  description?: string;
  allowedIPs?: string[];
  allowedOrigins?: string[];
  expiresInDays: number;
  existingKey?: string; // Optional field for using existing keys
}

/**
 * Prompt for confirmation with a question
 */
function promptForConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Generate a secure random API key
 * @returns A random API key string
 */
function generateApiKey(): string {
  // Generate random bytes and convert to a more readable format
  const bytes = crypto.randomBytes(40);
  let key = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  
  for (let i = 0; i < bytes.length; i++) {
    // Use modulo to get a character from our charset
    key += chars[bytes[i] % chars.length];
  }
  
  return key;
}

/**
 * Main hydration function for API keys
 */
async function hydrateApiKeys(): Promise<void> {
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

  // Try to read API keys config from multiple locations
  let jsonPaths = [
    path.join(__dirname, 'api_keys_config.json'),
    path.join(__dirname, '../data/api_keys_config.json')
  ];
  
  let apiKeyConfigs: ApiKeySeedData[] = [];
  let configFound = false;
  
  for (const jsonPath of jsonPaths) {
    if (fs.existsSync(jsonPath)) {
      try {
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        apiKeyConfigs = JSON.parse(rawData);
        console.log(`✅ Read ${apiKeyConfigs.length} API key configs from ${jsonPath}`);
        configFound = true;
        break;
      } catch (error) {
        console.error(`❌ Failed to parse API key config data from ${jsonPath}:`, error);
      }
    }
  }
  
  if (!configFound) {
    console.log('ℹ️ No API keys config file found, using default configs');
    
    // Default configuration - one key per user type
    apiKeyConfigs = [
      {
        userName: 'stownsend',
        keyType: KeyType.ADMIN,
        description: 'Default admin API key',
        expiresInDays: 365
      },
      {
        userName: 'testuser',
        keyType: KeyType.READ_ONLY,
        description: 'Default user API key',
        expiresInDays: 90
      }
    ];
  }

  try {
    // Connect to database using mongoose
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using mongoose');
    
    // Check if users exist and if they have existing API keys
    const existingUsers = await User.find({}).exec();
    
    if (existingUsers.length === 0) {
      console.error('❌ No users found in the database. Please run hydrate-users.ts first.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${existingUsers.length} users in the database`);
    
    // Keep track of users with API keys in the User collection
    const usersWithExistingKeys = existingUsers.filter(user => user.apiKey);
    console.log(`ℹ️ Found ${usersWithExistingKeys.length} users with existing API keys in User collection`);
    
    // Get usernames
    const availableUsernames = existingUsers.map(user => user.userName);
    
    // Validate that all configured users exist
    const invalidUsers = apiKeyConfigs.filter(config => !availableUsernames.includes(config.userName));
    
    if (invalidUsers.length > 0) {
      console.error('❌ Some configured users do not exist in the database:');
      invalidUsers.forEach(config => {
        console.error(`   - ${config.userName}`);
      });
      
      const proceed = await promptForConfirmation('Do you want to continue with valid users only? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('ℹ️ Operation cancelled');
        process.exit(0);
      }
      
      // Filter out invalid users
      apiKeyConfigs = apiKeyConfigs.filter(config => availableUsernames.includes(config.userName));
    }
    
    // Check if API keys collection has data
    const existingCount = await ApiKey.countDocuments();
    console.log(`\n📊 Current API keys count: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log(`⚠️ API keys collection already has ${existingCount} documents`);
      const confirm = await promptForConfirmation('Do you want to delete existing API keys and create new ones? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await ApiKey.deleteMany({});
        console.log('✅ Deleted existing API keys');
        
        // Verify deletion
        const countAfterDelete = await ApiKey.countDocuments();
        console.log(`📊 API keys count after deletion: ${countAfterDelete}`);
      } else {
        console.log('ℹ️ Keeping existing API keys');
        // Just append new ones for users that don't have keys
        const usersWithKeys = await ApiKey.distinct('userName');
        apiKeyConfigs = apiKeyConfigs.filter(config => !usersWithKeys.includes(config.userName));
        
        if (apiKeyConfigs.length === 0) {
          console.log('ℹ️ All users already have API keys, nothing to do');
          process.exit(0);
        }
        
        console.log(`ℹ️ Will create API keys for ${apiKeyConfigs.length} users without keys`);
      }
    }
    
    // Create API keys based on existing keys in User collection
    console.log('\n📝 Processing existing API keys from User collection...');
    const results = [];
    const now = new Date();
    
    // First, process users with existing API keys from the User model
    for (const user of usersWithExistingKeys) {
      try {
        // Check if this user already has an API key in the ApiKey collection
        const existingApiKey = await ApiKey.findOne({ userName: user.userName });
        
        if (existingApiKey) {
          console.log(`ℹ️ User ${user.userName} already has an API key in the ApiKey collection. Skipping.`);
          continue;
        }
        
        // Determine key type based on user role
        const keyType = user.role === 'admin' ? KeyType.ADMIN : KeyType.READ_ONLY;
        
        // Calculate expiration date - 1 year for admins, 90 days for regular users
        const expiresInDays = user.role === 'admin' ? 365 : 90;
        const expireDateTime = new Date(now);
        expireDateTime.setDate(expireDateTime.getDate() + expiresInDays);
        
        // We'll keep a record of the raw API key for administration
        const rawApiKey = user.apiKey || generateApiKey();
        
        // Create API key record
        const apiKeyData = {
          apiKey: rawApiKey, // Will be hashed during save
          userName: user.userName,
          apiStart: now,
          apiExpireDateTime: expireDateTime,
          isRevoked: false,
          usageCount: 0,
          description: `API key for ${user.userName}`,
          createdBy: 'hydration-script',
          keyType: keyType,
          allowedIPs: [],
          allowedOrigins: ['http://localhost:3000', 'https://rdcircuitry.com'],
          status: KeyStatus.ACTIVE,
          modificationHistory: [{
            timestamp: now,
            action: 'CREATED',
            performedBy: 'hydration-script',
            details: 'Migrated from User collection during hydration'
          }]
        };
        
        // Create new API key document
        const apiKey = new ApiKey(apiKeyData);
        
        // Explicitly hash the API key
        const salt = await bcrypt.genSalt(10);
        apiKey.apiKey = await bcrypt.hash(rawApiKey, salt);
        
        // Save the API key
        await apiKey.save();
        
        results.push({
          success: true,
          userName: user.userName,
          rawApiKey,
          apiKeyId: apiKey._id,
          expireDateTime: expireDateTime,
          source: 'user-migration'
        });
        
        console.log(`✅ Migrated existing API key for user: ${user.userName}`);
      } catch (error) {
        results.push({
          success: false,
          userName: user.userName,
          error: error instanceof Error ? error.message : 'Unknown error',
          source: 'user-migration'
        });
        
        console.error(`❌ Failed to migrate API key for user ${user.userName}:`, error);
      }
    }
    
    // Next, process any remaining API key configs from the configuration file
    console.log('\n📝 Creating API keys from configuration...');
    
    for (const config of apiKeyConfigs) {
      // Skip users who already had their keys migrated
      if (results.some(r => r.success && r.userName === config.userName)) {
        console.log(`ℹ️ User ${config.userName} already had an API key migrated. Skipping config.`);
        continue;
      }
      
      try {
        // Use the existingKey from config or generate a new one
        const rawApiKey = config.existingKey || generateApiKey();
        
        // Calculate expiration date
        const expireDateTime = new Date(now);
        expireDateTime.setDate(expireDateTime.getDate() + config.expiresInDays);
        
        // Create API key document
        const apiKeyData = {
          apiKey: rawApiKey, // Will be hashed by the pre-save middleware
          userName: config.userName,
          apiStart: now,
          apiExpireDateTime: expireDateTime,
          isRevoked: false,
          usageCount: 0,
          description: config.description || `API key for ${config.userName}`,
          createdBy: 'hydration-script',
          keyType: config.keyType,
          allowedIPs: config.allowedIPs || [],
          allowedOrigins: config.allowedOrigins || ['http://localhost:3000', 'https://rdcircuitry.com'],
          status: KeyStatus.ACTIVE,
          modificationHistory: [{
            timestamp: now,
            action: 'CREATED',
            performedBy: 'hydration-script',
            details: config.existingKey ? 'Restored from backup configuration' : 'Created during initial hydration from config'
          }]
        };
        
        // Save API key (this will trigger hashing in the pre-save hook)
        const apiKey = new ApiKey(apiKeyData);
        
        // Explicitly hash the API key
        const salt = await bcrypt.genSalt(10);
        apiKey.apiKey = await bcrypt.hash(rawApiKey, salt);
        
        await apiKey.save();
        
        results.push({
          success: true,
          userName: config.userName,
          rawApiKey, // Keep raw key for display
          apiKeyId: apiKey._id,
          expireDateTime: expireDateTime,
          source: config.existingKey ? 'existing-key-config' : 'new-key-config'
        });
        
        console.log(`✅ Created ${config.existingKey ? 'restored' : 'new'} API key for user: ${config.userName}`);
      } catch (error) {
        results.push({
          success: false,
          userName: config.userName,
          error: error instanceof Error ? error.message : 'Unknown error',
          source: 'config-file'
        });
        
        console.error(`❌ Failed to create API key for user ${config.userName}:`, error);
      }
    }
    
    // Report results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n✅ Successfully created/migrated ${successful.length} API keys`);
    if (failed.length > 0) {
      console.log(`⚠️ Failed to create/migrate ${failed.length} API keys:`);
      failed.forEach(result => {
        console.log(`   - ${result.userName}: ${(result as any).error}`);
      });
    }
    
    // Display raw API keys for admin reference (only shown once)
    console.log('\n📝 RAW API KEYS (for admin reference only, stored in hashed form):');
    successful.forEach(result => {
      const r = result as any;
      console.log(`   ${r.userName}: ${r.rawApiKey}`);
      console.log(`   Expires: ${r.expireDateTime.toISOString()}`);
      console.log(`   Source: ${r.source}`);
      console.log('   ─────────────────────────────────────────────────────');
    });
    console.log('\n⚠️ IMPORTANT: Save these API keys now! They are stored in hashed form and cannot be retrieved later.');
    
    // Verify the insertion by reading back
    const verificationRead = await ApiKey.find({}).exec();
    console.log(`\n🔍 Verification read found ${verificationRead.length} API keys:`);
    verificationRead.forEach(apiKey => {
      console.log(`\n   User: ${apiKey.userName}`);
      console.log(`   - Key Type: ${apiKey.keyType}`);
      console.log(`   - Status: ${apiKey.status}`);
      console.log(`   - API Key exists (hashed): ${!!apiKey.apiKey}`);
      console.log(`   - Created By: ${apiKey.createdBy}`);
      console.log(`   - Expires: ${apiKey.apiExpireDateTime}`);
      console.log(`   - Document ID: ${apiKey._id}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error details:');
    console.error('Message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Name:', error instanceof Error ? error.name : 'Unknown error type');
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n📡 Database connection closed');
  }
}

// Run the hydration script
hydrateApiKeys().catch(error => {
  console.error('💥 Hydration script failed:', error);
  process.exit(1);
}); 