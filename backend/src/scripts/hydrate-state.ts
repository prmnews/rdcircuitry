/**
 * Script to hydrate state collection with initial timer state
 * TypeScript version
 */
import dotenv from 'dotenv';
import { connectToDatabase } from '../lib/database';
import { State } from '../models';
import { IResetEvents } from '../types/models';
import mongoose from 'mongoose';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });

/**
 * Prompt for confirmation with a question
 */
function promptForConfirmation(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main hydration function for initial timer state
 */
async function hydrateState(): Promise<void> {
  console.log('🔍 Starting state hydration script...');

  // Check for flags
  const shouldDrop = process.argv.includes('--drop');
  const shouldConfirm = process.argv.includes('--confirm');
  
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
    // Connect to database using mongoose
    await connectToDatabase();
    console.log('✅ Connected to MongoDB using mongoose');
    
    // Handle drop collection if flag is present
    if (shouldDrop) {
      console.log('⚠️ Drop flag detected');
      
      // Only confirm if --confirm flag is present
      let shouldProceedWithDrop = true;
      if (shouldConfirm) {
        const confirm = await promptForConfirmation('Are you sure you want to drop the state collection? This cannot be undone! (y/n): ');
        shouldProceedWithDrop = confirm.toLowerCase() === 'y';
      }
      
      if (shouldProceedWithDrop) {
        try {
          await mongoose.connection.dropCollection('states');
          console.log('🗑️ State collection dropped');
        } catch (err) {
          // Ignore error if collection doesn't exist (error code 26)
          const error = err as any;
          if (error.code !== 26) {
            throw err;
          } else {
            console.log('ℹ️ Collection does not exist, nothing to drop');
          }
        }
      } else {
        console.log('ℹ️ Drop operation cancelled');
        process.exit(0);
      }
    }

    // Create initial state document
    const now = new Date();
    
    // Create reset events structure
    const resetEvents: IResetEvents = {
      total: 0,
      last24Hours: 0
    };

    // Create initial state document based on the State model
    const stateData = {
      _id: "timer_state",
      currentState: now,
      isRDI: false,
      resetEvents,
      updatedAt: now,
      createdAt: now
    };

    // Check if state document already exists
    const existingState = await State.findOne({ _id: stateData._id }).exec();
    
    if (existingState && !shouldDrop) {
      console.log('⚠️ State document already exists');
      
      // Only prompt for confirmation if --confirm flag is present
      let shouldUpdateExisting = true;
      if (shouldConfirm) {
        const confirm = await promptForConfirmation('Do you want to update the existing state? (y/n): ');
        shouldUpdateExisting = confirm.toLowerCase() === 'y';
      }
      
      if (shouldUpdateExisting) {
        await State.updateOne(
          { _id: stateData._id },
          { 
            $set: { 
              currentState: stateData.currentState,
              isRDI: stateData.isRDI,
              resetEvents: stateData.resetEvents,
              updatedAt: now
            }
          }
        );
        console.log('✅ Updated existing state');
      } else {
        console.log('ℹ️ Keeping existing state');
        process.exit(0);
      }
    } else {
      // Insert new state document
      const state = new State(stateData);
      await state.save();
      console.log('✅ Created new state document');
    }
    
    // Show current state with all fields
    const currentState = await State.findOne({ _id: stateData._id }).exec();
    
    if (currentState) {
      console.log('\n📋 Current Timer State:');
      console.log(`   - Current State: ${currentState.currentState.toISOString()}`);
      console.log(`   - isRDI: ${currentState.isRDI}`);
      console.log(`   - Reset Events:`);
      console.log(`     - Total: ${currentState.resetEvents.total}`);
      console.log(`     - Last 24 Hours: ${currentState.resetEvents.last24Hours}`);
      console.log(`   - Created At: ${currentState.createdAt.toISOString()}`);
      console.log(`   - Updated At: ${currentState.updatedAt.toISOString()}`);
    } else {
      console.error('❌ Failed to retrieve the created state document');
    }
    
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

// Run the script
hydrateState().catch(error => {
  console.error('💥 State hydration failed:', error);
  process.exit(1);
}); 