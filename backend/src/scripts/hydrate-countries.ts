/**
 * Script to hydrate countries collection with timezone data
 * TypeScript version
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../lib/database';
import { Country } from '../models';
import { ITimeZoneMetadata } from '../types/models';
import mongoose from 'mongoose';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });

// Define country data interface matching the Country model
interface CountrySeedData {
  countryCode: string;
  countryName: string;
  metadata: ITimeZoneMetadata[];
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
 * Main hydration function for countries
 */
async function hydrateCountries(): Promise<void> {
  console.log('🔍 Starting countries timezone hydration script...');

  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  if (!process.env.MONGODB_DB) {
    console.error('❌ MONGODB_DB is not defined in .env.local');
    process.exit(1);
  }

  // Read country data from JSON file
  const jsonPath = path.join(__dirname, '../data/country_timezones.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  let countryData: CountrySeedData[];
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    countryData = JSON.parse(rawData);
    console.log(`✅ Read ${countryData.length} countries from JSON file`);
  } catch (error) {
    console.error('❌ Failed to parse country data:', error);
    process.exit(1);
  }

  try {
    // Connect to database using mongoose
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using mongoose');
    
    // Validate data format against schema
    console.log('🔍 Validating data format...');
    const invalidCountries = countryData.filter(country => {
      return !country.countryCode || 
             !country.countryName || 
             !Array.isArray(country.metadata) ||
             country.metadata.some(tz => !tz.timeZone || !tz.gmtOffset);
    });

    if (invalidCountries.length > 0) {
      console.error('❌ Invalid country data format found:');
      invalidCountries.forEach(country => {
        console.error(`   - ${country.countryName || 'Unknown'} (${country.countryCode || 'No code'})`);
      });
      process.exit(1);
    }
    console.log('✅ Data format verified');
    
    // Check if collection has data
    const existingCount = await Country.countDocuments();
    console.log(`\n📊 Current countries count: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log(`⚠️ Countries collection already has ${existingCount} documents`);
      const confirm = await promptForConfirmation('Do you want to delete existing countries and insert new ones? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await Country.deleteMany({});
        console.log('✅ Deleted existing countries');
        
        // Verify deletion
        const countAfterDelete = await Country.countDocuments();
        console.log(`📊 Countries count after deletion: ${countAfterDelete}`);
      } else {
        console.log('ℹ️ Keeping existing countries and adding new ones');
      }
    }
    
    // Insert countries with Mongoose
    console.log('\n📝 Inserting countries...');
    
    const insertionResults = await Promise.all(
      countryData.map(async (countryData) => {
        try {
          const country = new Country(countryData);
          await country.save();
          return { success: true, countryName: countryData.countryName };
        } catch (err) {
          return { 
            success: false, 
            countryName: countryData.countryName, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          };
        }
      })
    );
    
    // Report results
    const successful = insertionResults.filter(r => r.success);
    const failed = insertionResults.filter(r => !r.success);
    
    console.log(`✅ Successfully inserted ${successful.length} countries`);
    if (failed.length > 0) {
      console.log(`⚠️ Failed to insert ${failed.length} countries:`);
      failed.forEach(result => {
        console.log(`   - ${result.countryName}: ${(result as any).error}`);
      });
    }
    
    // Verify the insertion by reading back
    const verificationRead = await Country.find({}).exec();
    console.log('\n📋 Inserted countries:');
    verificationRead.forEach(country => {
      console.log(`\n   Country: ${country.countryName} (${country.countryCode})`);
      console.log(`   - Timezones: ${country.metadata.length}`);
      console.log(`   - Document ID: ${country._id}`);
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
hydrateCountries().catch(error => {
  console.error('💥 Hydration script failed:', error);
  process.exit(1);
}); 