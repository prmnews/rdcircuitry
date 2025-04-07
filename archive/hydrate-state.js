// Script to hydrate state collection with initial timer state
require('dotenv').config({ path: '.env.local' });
const { connectToDatabase, getStateCollection } = require('../lib/db/mongodb');

async function hydrateState() {
  console.log('🔍 Starting state hydration script...');

  // Check for --drop flag
  const shouldDrop = process.argv.includes('--drop');
  
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
    
    const stateCollection = await getStateCollection();

    // Handle drop collection if flag is present
    if (shouldDrop) {
      console.log('⚠️ Drop flag detected');
      const confirm = await promptForConfirmation('Are you sure you want to drop the state collection? This cannot be undone! (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await stateCollection.drop().catch(err => {
          // Ignore error if collection doesn't exist
          if (err.code !== 26) throw err;
        });
        console.log('🗑️ State collection dropped');
      } else {
        console.log('ℹ️ Drop operation cancelled');
        process.exit(0);
      }
    }

    // Create initial state document matching the State model exactly
    const now = new Date();
    const stateDoc = {
      _id: "timer_state",
      currentState: now,
      isRDI: false,
      lastResetTime: now,  // Required by model
      resetEvents: {       // Required by model
        total: 0,
        last24Hours: 0
      },
      createdAt: now,
      updatedAt: now,
      __v: 0
    };

    // Check if state document already exists
    const existingState = await stateCollection.findOne({ _id: stateDoc._id });
    if (existingState && !shouldDrop) {
      console.log('⚠️ State document already exists');
      const confirm = await promptForConfirmation('Do you want to update the existing state? (y/n): ');
      
      if (confirm.toLowerCase() === 'y') {
        await stateCollection.updateOne(
          { _id: stateDoc._id },
          { 
            $set: { 
              currentState: stateDoc.currentState,
              isRDI: stateDoc.isRDI,
              lastResetTime: stateDoc.lastResetTime,
              resetEvents: stateDoc.resetEvents,
              updatedAt: now
            },
            $inc: { __v: 1 } // Increment version number on update
          }
        );
        console.log('✅ Updated existing state');
      } else {
        console.log('ℹ️ Keeping existing state');
        process.exit(0);
      }
    } else {
      // Insert new state document
      await stateCollection.insertOne(stateDoc);
      console.log('✅ Created new state document');
    }
    
    // Show current state with all fields
    const currentState = await stateCollection.findOne({ _id: stateDoc._id });
    console.log('\n📋 Current Timer State:');
    console.log(`   - Current State: ${currentState.currentState.toISOString()}`);
    console.log(`   - isRDI: ${currentState.isRDI}`);
    console.log(`   - Last Reset Time: ${currentState.lastResetTime.toISOString()}`);
    console.log(`   - Reset Events:`);
    console.log(`     - Total: ${currentState.resetEvents.total}`);
    console.log(`     - Last 24 Hours: ${currentState.resetEvents.last24Hours}`);
    console.log(`   - Created At: ${currentState.createdAt.toISOString()}`);
    console.log(`   - Updated At: ${currentState.updatedAt.toISOString()}`);
    console.log(`   - Version: ${currentState.__v}`);
    
  } catch (error) {
    console.error('❌ Failed to hydrate state:', error);
    process.exit(1);
  }
}

// Helper function to prompt for confirmation (used when updating existing state)
function promptForConfirmation(message) {
  return new Promise((resolve) => {
    const { createInterface } = require('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run the script
hydrateState()
  .then(() => {
    console.log('✨ State hydration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 State hydration failed:', error);
    process.exit(1);
  }); 