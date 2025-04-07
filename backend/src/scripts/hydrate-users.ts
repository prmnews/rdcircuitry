/**
 * Script to hydrate users collection with initial user data
 * TypeScript version - Uses users.json file
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../lib/database';
import { User } from '../models';
import { IUser, UserRole } from '../types/models';
import mongoose from 'mongoose';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });

// Define user data interface matching the User model
interface UserSeedData {
  _id?: string;
  userName: string;
  pinNumber: string; // This will be hashed during save
  apiKey?: string;
  location: {
    countryCode: string;
    countryName: string;
    timeZone: string;
    gmtOffset: string;
  };
  role?: UserRole;
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
 * Main hydration function for users
 */
async function hydrateUsers(): Promise<void> {
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

  // First try to read from data/users.json
  let jsonPath = path.join(__dirname, '../data/users.json');
  
  // If not found, try the local script directory
  if (!fs.existsSync(jsonPath)) {
    jsonPath = path.join(__dirname, 'hydrate_users.json');
    
    // If still not found, error out
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ User data file not found at either ${path.join(__dirname, '../data/users.json')} or ${path.join(__dirname, 'hydrate_users.json')}`);
      process.exit(1);
    }
  }
  
  console.log(`📄 Reading user data from ${jsonPath}`);

  let userData: UserSeedData[];
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    userData = JSON.parse(rawData);
    console.log(`✅ Read ${userData.length} users from JSON file`);
  } catch (error) {
    console.error('❌ Failed to parse user data:', error);
    process.exit(1);
  }

  // Assign default roles if missing
  userData = userData.map(user => {
    // Set admin role for first user, regular user for others if missing
    if (!user.role) {
      if (user.userName === 'stownsend') {
        user.role = 'admin';
      } else {
        user.role = 'user';
      }
      console.log(`ℹ️ Assigned role '${user.role}' to user '${user.userName}'`);
    }
    
    // Ensure gmtOffset format is correct (remove "UTC " prefix if present)
    if (user.location && user.location.gmtOffset) {
      if (user.location.gmtOffset.startsWith('UTC ')) {
        user.location.gmtOffset = user.location.gmtOffset.replace('UTC ', '');
        console.log(`ℹ️ Fixed gmtOffset format for user '${user.userName}'`);
      }
    }
    
    return user;
  });

  try {
    // Connect to database using mongoose
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using mongoose');
    
    // Check if collection has data
    const existingCount = await User.countDocuments();
    console.log(`\n📊 Current users count: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log(`⚠️ Users collection already has ${existingCount} documents`);
      const confirm = await promptForConfirmation('Do you want to delete existing users and insert new ones? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await User.deleteMany({});
        console.log('✅ Deleted existing users');
        
        // Verify deletion
        const countAfterDelete = await User.countDocuments();
        console.log(`📊 Users count after deletion: ${countAfterDelete}`);
      } else {
        console.log('ℹ️ Keeping existing users and adding new ones');
      }
    }
    
    // Display raw credentials for admin reference (only shown once)
    console.log('\n📝 RAW CREDENTIALS (for admin reference only):');
    userData.forEach(user => {
      console.log(`   ${user.userName}: PIN=${user.pinNumber}`);
    });
    
    // Insert users with Mongoose (this will trigger the password hashing)
    console.log('\n📝 Inserting users...');
    
    const insertionResults = await Promise.all(
      userData.map(async (userData) => {
        try {
          // Remove _id field if present to let MongoDB generate a new one
          if (userData._id) {
            delete userData._id;
          }
          
          // Create user document
          const user = new User(userData);
          await user.save();
          
          return { success: true, userName: userData.userName };
        } catch (err) {
          return { 
            success: false, 
            userName: userData.userName, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          };
        }
      })
    );
    
    // Report results
    const successful = insertionResults.filter(r => r.success);
    const failed = insertionResults.filter(r => !r.success);
    
    console.log(`✅ Successfully inserted ${successful.length} users`);
    if (failed.length > 0) {
      console.log(`⚠️ Failed to insert ${failed.length} users:`);
      failed.forEach(result => {
        console.log(`   - ${result.userName}: ${(result as any).error}`);
      });
    }
    
    // Verify the insertion by reading back
    const verificationRead = await User.find({}).exec();
    console.log(`\n🔍 Verification read found ${verificationRead.length} users:`);
    verificationRead.forEach(user => {
      console.log(`\n   User: ${user.userName}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Location: ${user.location.countryName}, ${user.location.timeZone}`);
      console.log(`   - PIN hash exists: ${!!user.pinNumber}`);
      console.log(`   - API key exists: ${!!user.apiKey}`);
      console.log(`   - Document ID: ${user._id}`);
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
hydrateUsers().catch(error => {
  console.error('💥 Hydration script failed:', error);
  process.exit(1);
}); 