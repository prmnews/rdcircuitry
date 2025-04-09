/**
 * Utility script to update the timer state expiration datetime
 * TypeScript version
 * 
 * Usage:
 *   ts-node update-state.ts [minutes] [--reset-rdi] [--interactive]
 *   
 *   minutes: Number of minutes to set timer for (default: 3)
 *   --reset-rdi: Reset RDI status to false
 *   --interactive: Enable interactive prompts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/database';
import { State } from '../models';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });

/**
 * Prompt for input with a question
 */
function promptForInput(question: string): Promise<string> {
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
 * Parse command line arguments
 */
function parseArguments(): { minutes: number; resetRdi: boolean; interactive: boolean } {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const resetRdi = args.includes('--reset-rdi');
  
  // Try to find minutes argument (first non-flag argument)
  let minutes = parseInt(process.env.TIMER_INITIAL_MINUTES || "3");
  
  for (const arg of args) {
    if (!arg.startsWith('--')) {
      const parsed = parseInt(arg, 10);
      if (!isNaN(parsed) && parsed > 0) {
        minutes = parsed;
        break;
      }
    }
  }
  
  return { minutes, resetRdi, interactive };
}

/**
 * Main function to update the timer state
 */
async function updateState(): Promise<void> {
  console.log('🔍 Starting timer state update script...');
  
  // Parse command line arguments
  const args = parseArguments();

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
    
    // Check if state exists
    const state = await State.findOne({ _id: 'timer_state' });
    
    if (!state) {
      console.error('❌ Timer state not found. Please run hydrate-state.ts first.');
      process.exit(1);
    }
    
    // Get current state info
    console.log('\n📊 Current timer state:');
    const now = new Date();
    const currentExpiry = new Date(state.currentState);
    const remainingMs = currentExpiry.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
    
    console.log(`   - Current time: ${now.toISOString()}`);
    console.log(`   - Expiry time: ${currentExpiry.toISOString()}`);
    console.log(`   - Remaining time: ${remainingMinutes} minutes (${remainingMs}ms)`);
    console.log(`   - Is RDI: ${state.isRDI ? 'Yes' : 'No'}`);
    console.log(`   - Reset count (24h): ${state.resetEvents.last24Hours}`);
    console.log(`   - Reset count (total): ${state.resetEvents.total}`);
    
    // Get minutes to add (from args or prompt if interactive)
    let minutes = args.minutes;
    let resetRdi = args.resetRdi;
    
    if (args.interactive) {
      // Interactive mode - prompt for values
      const defaultMinutes = 5;
      const minutesInput = await promptForInput(`\nEnter minutes to set for timer (default: ${defaultMinutes}): `);
      minutes = minutesInput.trim() === '' ? defaultMinutes : parseInt(minutesInput, 10);
      
      if (isNaN(minutes) || minutes <= 0) {
        console.error('❌ Invalid minutes value. Please enter a positive number.');
        process.exit(1);
      }
      
    }
    
    // Calculate new expiration time
    const newExpiryTime = new Date(now.getTime() + minutes * 60 * 1000);
    
    // Update state
    const updateData: any = {
      currentState: newExpiryTime,
      isRDI: false,
      updatedAt: now
    };
    
    const updatedState = await State.findOneAndUpdate(
      { _id: 'timer_state' },
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedState) {
      console.error('❌ Failed to update timer state');
      process.exit(1);
    }
    
    // Log success
    console.log('\n✅ Timer state updated successfully:');
    console.log(`   - New expiry time: ${newExpiryTime.toISOString()}`);
    console.log(`   - Timer set for: ${minutes} minutes`);
    console.log(`   - Is RDI: ${updatedState.isRDI ? 'Yes' : 'No'}`);
    
    // Close database connection
    await mongoose.disconnect();
    console.log('\n📡 Database connection closed');
    
  } catch (error) {
    console.error('\n❌ Error details:');
    console.error('Message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Name:', error instanceof Error ? error.name : 'Unknown error type');
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
updateState().catch(error => {
  console.error('💥 State update script failed:', error);
  process.exit(1);
}); 