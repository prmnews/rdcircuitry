/**
 * Script to hydrate the MessageTimer collection with a single document
 * TypeScript version
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env' });

// MessageTimer model definition for this script
const MessageTimerSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: 'message_timer',
    required: true
  },
  triggerTime: { 
    type: Date, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: false
  },
  messageContent: {
    text: { 
      type: String, 
      required: true 
    },
    url: { 
      type: String 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

const MessageTimer = mongoose.model('MessageTimer', MessageTimerSchema);

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
 * Main function to hydrate the MessageTimer collection
 */
async function hydrateMessageTimer(): Promise<void> {
  console.log('🔍 Starting MessageTimer hydration...');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldDrop = args.includes('--drop');
  const shouldConfirm = args.includes('--confirm');
  
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
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    console.log(`🔌 Connecting to MongoDB ${dbName}...`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected to MongoDB');
    
    // Check if collection exists and has documents
    const count = await MessageTimer.countDocuments();
    console.log(`ℹ️ Found ${count} document(s) in MessageTimer collection`);
    
    // If collection has documents and --drop was provided, drop it
    if (count > 0 && shouldDrop) {
      if (shouldConfirm) {
        const confirm = await promptForConfirmation(
          `⚠️ This will DELETE all ${count} existing MessageTimer documents. Are you sure? (y/n): `
        );
        
        if (confirm.toLowerCase() !== 'y') {
          console.log('ℹ️ Operation cancelled');
          await mongoose.connection.close();
          process.exit(0);
        }
      }
      
      console.log('🗑️ Dropping MessageTimer collection...');
      await mongoose.connection.dropCollection('messagetimers');
      console.log('✅ MessageTimer collection dropped');
    } else if (count > 0) {
      if (shouldConfirm) {
        const confirm = await promptForConfirmation(
          `ℹ️ Found existing MessageTimer document. Update it? (y/n): `
        );
        
        if (confirm.toLowerCase() !== 'y') {
          console.log('ℹ️ Operation cancelled');
          await mongoose.connection.close();
          process.exit(0);
        }
      }
      
      console.log('📝 Updating existing MessageTimer document...');
    } else {
      console.log('📝 Creating new MessageTimer document...');
    }
    
    // Calculate trigger time (NOW + 10 minutes)
    const triggerTime = new Date(Date.now() + 10 * 60 * 1000);
    
    // Format the test message with current timestamp
    const timestamp = new Date().toISOString();
    const messageText = `Test message [counter: 1] generated at ${timestamp}`;
    
    // Create or update the MessageTimer document
    const messageTimerData = {
      _id: 'message_timer',
      triggerTime: triggerTime,
      active: false,
      messageContent: {
        text: messageText,
        url: 'https://google.com/?q=test'
      },
      updatedAt: new Date(),
      createdAt: new Date()
    };
    
    const result = await MessageTimer.findOneAndUpdate(
      { _id: 'message_timer' },
      messageTimerData,
      { upsert: true, new: true }
    );
    
    console.log('✅ MessageTimer document updated successfully:');
    
    if (result) {
      console.log(`   - Trigger Time: ${result.triggerTime}`);
      console.log(`   - Active: ${result.active}`);
      
      if (result.messageContent) {
        const messageText = result.messageContent.text || '';
        console.log(`   - Message: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);
        console.log(`   - URL: ${result.messageContent.url || 'N/A'}`);
      } else {
        console.log('   - Message: [No message content]');
      }
    } else {
      console.log('   - Warning: No result returned from database operation');
    }
    
    console.log('🎉 MessageTimer hydration completed successfully!');
  } catch (error) {
    console.error('💥 Error occurred during hydration:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the script
hydrateMessageTimer().catch(error => {
  console.error('💥 MessageTimer hydration script failed:', error);
  process.exit(1);
}); 