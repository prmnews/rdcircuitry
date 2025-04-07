// Script to hydrate events collection with initial test data
require('dotenv').config({ path: '.env.local' });
const { connectToDatabase, getEventsCollection, getUsersCollection } = require('../lib/db/mongodb');

// Define Event Schema (matching src/models/Event.ts)
const EventSchema = {
  userName: {
    type: String,
    required: true,
    index: true,
    ref: 'User'
  },
  isUserValidation: {
    type: Boolean,
    required: true,
    default: false
  },
  eventType: {
    type: String,
    required: true,
    enum: ['LOGIN', 'TIMER_RESET', 'TIMER_EXPIRED', 'MESSAGE_SCHEDULED'],
    index: true
  },
  location: {
    timeZone: { type: String, required: true },
    gmtOffset: { type: String, required: true }
  },
  trueDateTime: {
    type: Date,
    required: true,
    index: true
  },
  remainder: {
    type: Number,
    required: true
  },
  processed: {
    type: Boolean,
    default: false
  }
};

async function hydrateEvents() {
  console.log('🔍 Starting events hydration script...');

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
    
    const eventsCollection = await getEventsCollection();
    const usersCollection = await getUsersCollection();

    // Get existing users to reference in events
    const users = await usersCollection.find({}).toArray();
    if (users.length === 0) {
      console.error('❌ No users found in database. Please run hydrate:users first.');
      process.exit(1);
    }
    console.log(`✅ Found ${users.length} users to reference in events`);

    // Create test events
    const now = new Date();
    const testEvents = [
      {
        userName: users[0].userName,
        isUserValidation: true,
        eventType: 'LOGIN',
        location: users[0].location,
        trueDateTime: now,
        remainder: 180, // 3 minutes in dev mode
        processed: false
      },
      {
        userName: users[1].userName,
        isUserValidation: true,
        eventType: 'LOGIN',
        location: users[1].location,
        trueDateTime: now,
        remainder: 180,
        processed: false
      },
      {
        userName: users[2].userName,
        isUserValidation: true,
        eventType: 'LOGIN',
        location: users[2].location,
        trueDateTime: now,
        remainder: 180,
        processed: false
      },
      // Add some historical events
      {
        userName: users[0].userName,
        isUserValidation: false,
        eventType: 'TIMER_RESET',
        location: users[0].location,
        trueDateTime: new Date(now.getTime() - 3600000), // 1 hour ago
        remainder: 180,
        processed: true
      },
      {
        userName: users[1].userName,
        isUserValidation: false,
        eventType: 'TIMER_RESET',
        location: users[1].location,
        trueDateTime: new Date(now.getTime() - 7200000), // 2 hours ago
        remainder: 180,
        processed: true
      }
    ];

    // Validate data format against schema
    console.log('🔍 Validating data format...');
    const invalidEvents = testEvents.filter(event => {
      return !event.userName || 
             typeof event.isUserValidation !== 'boolean' ||
             !['LOGIN', 'TIMER_RESET', 'TIMER_EXPIRED', 'MESSAGE_SCHEDULED'].includes(event.eventType) ||
             !event.location?.timeZone ||
             !event.location?.gmtOffset ||
             !(event.trueDateTime instanceof Date) ||
             typeof event.remainder !== 'number';
    });

    if (invalidEvents.length > 0) {
      console.error('❌ Invalid event data format found:');
      invalidEvents.forEach(event => {
        console.error(`   - ${event.userName || 'Unknown'}: ${event.eventType || 'No type'}`);
      });
      process.exit(1);
    }
    console.log('✅ Data format verified');

    // Check if collection already has data
    const existingCount = await eventsCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️ Events collection already has ${existingCount} documents`);
      const confirm = await promptForConfirmation('Do you want to delete existing events and insert new ones? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await eventsCollection.deleteMany({});
        console.log('✅ Deleted existing events');
        
        // Verify deletion
        const countAfterDelete = await eventsCollection.countDocuments();
        console.log(`📊 Events count after deletion: ${countAfterDelete}`);
      } else {
        console.log('ℹ️ Keeping existing events and adding new ones');
      }
    }
    
    // Insert events
    console.log('\n📝 Inserting events...');
    const result = await eventsCollection.insertMany(testEvents);
    console.log(`✅ Successfully inserted ${result.insertedCount} events`);
    
    // Verify the insertion by reading back
    const verificationRead = await eventsCollection.find({}).toArray();
    console.log('\n📋 Inserted events:');
    verificationRead.forEach(event => {
      console.log(`\n   Event: ${event.eventType}`);
      console.log(`   - User: ${event.userName}`);
      console.log(`   - Time: ${event.trueDateTime.toISOString()}`);
      console.log(`   - Location: ${event.location.timeZone}`);
      console.log(`   - Remainder: ${event.remainder} seconds`);
      console.log(`   - Processed: ${event.processed}`);
      console.log(`   - Document ID: ${event._id}`);
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
hydrateEvents()
  .then(() => {
    console.log('✨ Events hydration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Events hydration failed:', error);
    process.exit(1);
  }); 