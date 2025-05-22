import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Server Config
export const SERVER_CONFIG = {
  PORT: process.env.PORT || '4000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || '3001',
  SERVER_IP: process.env.SERVER_IP,
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
  PRODUCTION_DOMAIN: process.env.PRODUCTION_DOMAIN || 'rdcircuitry.com',
  PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://rdcircuitry.com',
};

// Database Config
export const DB_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB || 'rdcircuitry',
};

// Security Config
export const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  MESSAGE_WEBHOOK_SECRET: process.env.MESSAGE_WEBHOOK_SECRET,
};

// Timer Config
export const TIMER_CONFIG = {
  INITIAL_MINUTES: parseInt(process.env.TIMER_INITIAL_MINUTES || '3', 10),
  MESSAGE_ENABLE: process.env.MESSAGE_ENABLE === 'true',
  MESSAGE_YELLOW_MINUTES: parseInt(process.env.MESSAGE_YELLOW_MINUTES || '2', 10),
  MESSAGE_RED_MINUTES: parseInt(process.env.MESSAGE_RED_MINUTES || '1', 10),
  LAG_TIME_MINUTES: parseInt(process.env.LAG_TIME_MINUTES || '1', 10),
};

// Twitter/X API Config
export const TWITTER_CONFIG = {
  API_KEY: process.env.TWITTER_API_KEY,
  API_SECRET: process.env.TWITTER_API_SECRET,
  ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
  ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
  BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
};

// Validate critical configuration
export function validateConfig(): void {
  const missingVars: string[] = [];

  // Check database config
  if (!DB_CONFIG.MONGODB_URI) missingVars.push('MONGODB_URI');
  if (!DB_CONFIG.MONGODB_DB) missingVars.push('MONGODB_DB');

  // Check security config
  if (!SECURITY_CONFIG.JWT_SECRET) missingVars.push('JWT_SECRET');
  if (!SECURITY_CONFIG.ENCRYPTION_KEY) missingVars.push('ENCRYPTION_KEY');

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
} 