// Script to hydrate countriesTZ collection from JSON data
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { connectToDatabase, getCountriesTZCollection } = require('../lib/db/mongodb');

// Define Country Schema (matching src/models/Country.ts)
const CountrySchema = {
  countryCode: {
    type: String,
    required: true,
    unique: true
  },
  countryName: {
    type: String,
    required: true
  },
  metadata: [{
    timeZone: { type: String, required: true },
    gmtOffset: { type: String, required: true }
  }]
};

async function hydrateCountries() {
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

  let countryData;
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    countryData = JSON.parse(rawData);
    console.log(`✅ Read ${countryData.length} countries from JSON file`);
  } catch (error) {
    console.error('❌ Failed to parse country data:', error);
    process.exit(1);
  }

  try {
    // Use centralized connection handler
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using centralized handler');
    
    const countriesCollection = await getCountriesTZCollection();
    
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

    // Check if collection already has data
    const existingCount = await countriesCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️ Countries collection already has ${existingCount} documents`);
      const confirm = await promptForConfirmation('Do you want to delete existing countries and insert new ones? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await countriesCollection.deleteMany({});
        console.log('✅ Deleted existing countries');
        
        // Verify deletion
        const countAfterDelete = await countriesCollection.countDocuments();
        console.log(`📊 Countries count after deletion: ${countAfterDelete}`);
      } else {
        console.log('ℹ️ Keeping existing countries and adding new ones');
      }
    }
    
    // Insert countries
    console.log('\n📝 Inserting countries...');
    const result = await countriesCollection.insertMany(countryData);
    console.log(`✅ Successfully inserted ${result.insertedCount} countries`);
    
    // Verify the insertion by reading back
    const verificationRead = await countriesCollection.find({}).toArray();
    console.log('\n📋 Inserted countries:');
    verificationRead.forEach(country => {
      console.log(`\n   Country: ${country.countryName} (${country.countryCode})`);
      console.log(`   - Timezones: ${country.metadata.length}`);
      console.log(`   - Document ID: ${country._id}`);
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
hydrateCountries()
  .then(() => {
    console.log('✨ Countries hydration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Countries hydration failed:', error);
    process.exit(1);
  }); 