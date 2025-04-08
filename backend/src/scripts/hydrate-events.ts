/**
 * Script to hydrate events collection with initial timer reset events
 * TypeScript version
 */
import dotenv from 'dotenv';
import { connectToDatabase } from '../lib/database';
import { Event, User } from '../models';
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
 * Generate random number between min and max (inclusive)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a date between start and end
 */
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Main hydration function for timer reset events
 */
async function hydrateEvents(): Promise<void> {
  console.log('🔍 Starting events hydration script...');

  // Check for flags
  const shouldDrop = process.argv.includes('--drop');
  const shouldConfirm = process.argv.includes('--confirm');
  
  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  if (!process.env.MONGODB_DB) {
    console.error('❌ MONGODB_DB is not defined in .env');
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
        const confirm = await promptForConfirmation('Are you sure you want to drop the events collection? This cannot be undone! (y/n): ');
        shouldProceedWithDrop = confirm.toLowerCase() === 'y';
      }
      
      if (shouldProceedWithDrop) {
        try {
          await mongoose.connection.dropCollection('events');
          console.log('🗑️ Events collection dropped');
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

    // Get all users to distribute events across them
    const users = await User.find({}).exec();
    
    if (!users || users.length === 0) {
      console.error('❌ No users found. Please run hydrate-users.ts first');
      process.exit(1);
    }
    
    console.log(`🧑‍💻 Found ${users.length} users to distribute events`);
    
    // Generate events for the past 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Generate between 15-30 random events
    const totalEvents = getRandomInt(15, 30);
    console.log(`🔢 Generating ${totalEvents} random reset events`);
    
    // Create batch of timer reset events
    const eventDocuments = [];
    
    for (let i = 0; i < totalEvents; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomDate = getRandomDate(sevenDaysAgo, now);
      
      // Some events in the last 24 hours
      let inLast24Hours = false;
      if (i >= totalEvents - 5) {
        // Last 5 events are within 24 hours
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        inLast24Hours = true;
        randomDate.setTime(getRandomDate(last24Hours, now).getTime());
      }
      
      const location = randomUser.location || {
        countryCode: 'US',
        countryName: 'United States',
        timeZone: 'America/Los_Angeles',
        gmtOffset: '-480'
      };
      
      // Random remainder between 0-3 minutes (in seconds)
      const remainder = getRandomInt(0, 180);
      
      const eventDocument = {
        userName: randomUser.userName,
        isUserValidation: true,
        eventType: 'TIMER_RESET',
        location,
        trueDateTime: randomDate,
        remainder,
        processed: true,
        details: JSON.stringify({
          reason: 'Test reset event',
          remainder
        }),
        createdAt: randomDate,
        updatedAt: randomDate
      };
      
      eventDocuments.push(eventDocument);
      
      if (inLast24Hours) {
        console.log(`📅 Added event for ${randomUser.userName} at ${randomDate.toISOString()} (last 24h)`);
      }
    }
    
    // Insert events
    await Event.insertMany(eventDocuments);
    console.log(`✅ Successfully inserted ${eventDocuments.length} events`);
    
    // Count events in the last 24 hours
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const eventsInLast24Hours = await Event.countDocuments({
      eventType: 'TIMER_RESET',
      trueDateTime: { $gte: last24Hours }
    });
    
    console.log(`📊 Events in last 24 hours: ${eventsInLast24Hours}`);
    console.log(`📊 Total events: ${eventDocuments.length}`);
    
    // Update state document with reset event counts
    const State = mongoose.model('State');
    await State.updateOne(
      { _id: 'timer_state' },
      {
        $set: {
          'resetEvents.total': eventDocuments.length,
          'resetEvents.last24Hours': eventsInLast24Hours,
          updatedAt: now
        }
      }
    );
    
    console.log('✅ Updated state document with reset event counts');
    
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
hydrateEvents().catch(error => {
  console.error('💥 Events hydration failed:', error);
  process.exit(1);
}); 