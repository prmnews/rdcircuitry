/**
 * Message Constructor - Formats and prepares messages for posting to X.com
 */

const fs = require('fs');
const path = require('path');

// Load messages from JSON file
const loadMessages = () => {
  try {
    const messagesPath = path.join(process.cwd(), 'src', 'data', 'messages.json');
    console.log(`🔴 DEBUGGING: Loading messages from: ${messagesPath}`);
    const messagesData = fs.readFileSync(messagesPath, 'utf8');
    const messages = JSON.parse(messagesData);
    console.log(`🔴 DEBUGGING: Loaded ${messages.length} messages`);
    return messages;
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
};

// Get a random integer between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Replace placeholder variables in message text
const formatMessage = (messageTemplate, sequence) => {
  const timestamp = new Date().toISOString();
  const randomMultiplier = getRandomInt(7, 12);
  
  return messageTemplate
    .replace('{sequence * rnd(7, 12)}', sequence * randomMultiplier)
    .replace('{timestamp}', timestamp);
};

/**
 * Constructs a message for posting to X.com
 * @returns {Object} Formatted message with text and URL
 */
const constructMessage = () => {
  // Load available messages
  const messages = loadMessages();
  
  if (!messages || messages.length === 0) {
    throw new Error('No messages available for construction');
  }
  
  // Select a random message
  const randomIndex = getRandomInt(0, messages.length - 1);
  const selectedMessage = messages[randomIndex];
  
  console.log(`🔴 DEBUGGING: Selected message sequence #${selectedMessage.sequence} (index: ${randomIndex}, category: ${selectedMessage.category})`);
  
  // Format the message text (replace placeholders)
  const formattedText = formatMessage(
    selectedMessage.message, 
    selectedMessage.sequence
  );
  
  console.log(`🔴 DEBUGGING: Formatted message text: ${formattedText.substring(0, 50)}...`);
  console.log(`🔴 DEBUGGING: URL: ${selectedMessage.url}`);
  
  // Return the constructed message
  return {
    text: formattedText,
    url: selectedMessage.url
  };
};

module.exports = {
  constructMessage
}; 