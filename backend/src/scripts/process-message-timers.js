/**
 * Message Timer Processing Script
 * This script checks for active message timers and processes them if they've expired
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';
const WEBHOOK_SECRET = process.env.MESSAGE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error('Error: MESSAGE_WEBHOOK_SECRET environment variable is required');
  process.exit(1);
}

async function processMessageTimers() {
  try {
    console.log('🔄 Checking for expired message timers...');
    
    const response = await axios.post(`${API_BASE_URL}/message/process`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET
      }
    });
    
    if (response.data.success) {
      if (response.data.processed) {
        console.log('✅ Message processed successfully!');
        console.log('Result:', response.data.result);
      } else {
        console.log('ℹ️ No messages to process:', response.data.message);
      }
    } else {
      console.error('❌ Error processing message:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error calling message process API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the script
processMessageTimers().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 