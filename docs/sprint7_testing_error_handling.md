# Sprint 7: Testing and Error Handling

## Goal
Implement comprehensive testing strategies and robust error handling mechanisms to ensure the application is reliable, recoverable, and provides clear feedback to users.

## Implementation

### Step 1: Set up testing infrastructure
```bash
# Navigate to the project root
cd /d/Repo/rdi

# Create test directories and files
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p tests/scripts
touch jest.config.js
touch tests/setup.js
```

### Step 2: Configure Jest for testing

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'app/**/*.js',
    'lib/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true
};
```

### Step 3: Create test setup file

```javascript
// tests/setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { logger } = require('../lib/logger');

// Suppress console logs during tests
logger.level = process.env.LOG_LEVEL || 'error';

let mongoServer;

// Connect to a new in-memory database before running tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (error) {
    console.error('MongoDB memory server connection error:', error);
    throw error;
  }
});

// Clear all collections after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Close the database and server after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
});
```

### Step 4: Implement error handling utilities

```javascript
// lib/error/handler.js
const { logger } = require('../logger');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes used throughout the application
 */
const ErrorCodes = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMER_ERROR: 'TIMER_ERROR',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  MESSAGE_ERROR: 'MESSAGE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
};

/**
 * Handles operational errors for API routes
 * @param {Error} error - The error object
 * @returns {Response} - JSON response with error details
 */
function handleApiError(error) {
  // Log the error
  logger.error('API Error:', error);
  
  // If it's an operational error (expected), return it with appropriate status
  if (error instanceof AppError) {
    return new Response(JSON.stringify({
      success: false,
      code: error.code,
      message: error.message
    }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // For unexpected errors, return a generic error
  return new Response(JSON.stringify({
    success: false,
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'An unexpected error occurred'
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Asynchronous wrapper to handle try/catch in route handlers
 * @param {Function} fn - The route handler function
 * @returns {Function} - Wrapped function with error handling
 */
function asyncHandler(fn) {
  return async (req, res) => {
    try {
      return await fn(req, res);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Middleware to handle errors in Express routes (for server.js)
 */
function errorMiddleware(err, req, res, next) {
  logger.error('Express Error:', err);
  
  // If it's an operational error, return the appropriate status and message
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message
    });
  }
  
  // For unexpected errors, return a generic 500 error
  return res.status(500).json({
    success: false,
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'An unexpected error occurred'
  });
}

module.exports = {
  AppError,
  ErrorCodes,
  handleApiError,
  asyncHandler,
  errorMiddleware
};
```

### Step 5: Implement retry mechanism for critical operations

```javascript
// lib/error/retry.js
const { logger } = require('../logger');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in milliseconds
 * @param {number} options.maxDelay - Maximum delay in milliseconds
 * @param {Function} options.shouldRetry - Function to determine if we should retry based on error
 * @returns {Promise<any>} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      // If we've reached the maximum retries or shouldn't retry, throw the error
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff (with jitter)
      const delay = Math.min(
        maxDelay,
        initialDelay * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2)
      );
      
      logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`, {
        error: error.message,
        attempt,
        delay
      });
      
      // Wait before the next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Retry a database operation with appropriate error handling
 * @param {Function} operation - Database operation to retry
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} - Result of the operation
 */
async function withDbRetry(operation, operationName = 'Database operation') {
  const { AppError, ErrorCodes } = require('./handler');
  
  try {
    return await withRetry(operation, {
      maxRetries: 3,
      initialDelay: 500,
      shouldRetry: (error) => {
        // Retry on connection errors, transient errors, etc.
        return error.name === 'MongoNetworkError' ||
               error.name === 'MongoTimeoutError' ||
               (error.code && [11000, 11001, 16500].includes(error.code));
      }
    });
  } catch (error) {
    logger.error(`${operationName} failed after retries:`, error);
    
    // Wrap the error in an AppError
    throw new AppError(
      `${operationName} failed: ${error.message}`,
      500,
      ErrorCodes.DATABASE_ERROR
    );
  }
}

module.exports = {
  withRetry,
  withDbRetry
};
```

### Step 6: Create unit tests for timer functionality

```javascript
// tests/unit/timer.test.js
const { calculateExpiryTime, isTimerExpired } = require('../../lib/timer/utils');

describe('Timer Utilities', () => {
  // Mock the environment variables
  beforeEach(() => {
    process.env.TIMER_INITIAL_MINUTES = '3';
  });
  
  describe('calculateExpiryTime', () => {
    test('should calculate expiry time correctly using initial minutes', () => {
      const now = new Date('2023-01-01T12:00:00Z');
      const result = calculateExpiryTime(now);
      
      // Should be 3 minutes later
      expect(result.getTime()).toBe(now.getTime() + 3 * 60 * 1000);
    });
    
    test('should use current time if not provided', () => {
      const before = new Date();
      const result = calculateExpiryTime();
      const after = new Date();
      
      // Result should be between before + 3 minutes and after + 3 minutes
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime() + 3 * 60 * 1000);
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime() + 3 * 60 * 1000);
    });
  });
  
  describe('isTimerExpired', () => {
    test('should return true if expiry time is in the past', () => {
      const pastTime = new Date(Date.now() - 60000); // 1 minute ago
      expect(isTimerExpired(pastTime)).toBe(true);
    });
    
    test('should return false if expiry time is in the future', () => {
      const futureTime = new Date(Date.now() + 60000); // 1 minute in the future
      expect(isTimerExpired(futureTime)).toBe(false);
    });
  });
});
```

### Step 7: Create integration tests for API endpoints

```javascript
// tests/integration/timer-api.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { createServer } = require('http');
const nextHandler = require('../../server');
const { State } = require('../../app/models');
const { connectDB } = require('../../lib/db');

describe('Timer API endpoints', () => {
  let server;
  let agent;
  
  // Set up the server and database connection
  beforeAll(async () => {
    await connectDB();
    server = createServer(nextHandler);
    agent = request.agent(server);
    
    // Mock authenticated session
    // Note: In a real test, use a proper auth mechanism
    agent.set('Cookie', ['auth-session=mockSessionId']);
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    server.close();
  });
  
  // Test the timer state endpoint
  describe('GET /api/timer/state', () => {
    beforeEach(async () => {
      // Create a test timer state
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() + 180000), // 3 minutes in the future
        isRDI: false,
        resetEvents: {
          last24Hours: 5,
          total: 10
        }
      });
    });
    
    test('should return the current timer state', async () => {
      const response = await agent.get('/api/timer/state');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe('timer_state');
      expect(response.body.data.isRDI).toBe(false);
      expect(response.body.data.resetEvents.last24Hours).toBe(5);
      expect(response.body.data.resetEvents.total).toBe(10);
      
      // Check that currentState is a valid date string
      expect(new Date(response.body.data.currentState).getTime()).toBeGreaterThan(Date.now());
    });
  });
  
  // Test the timer reset endpoint
  describe('POST /api/timer/reset', () => {
    beforeEach(async () => {
      // Create a test timer state
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() + 60000), // 1 minute in the future
        isRDI: false,
        resetEvents: {
          last24Hours: 5,
          total: 10
        }
      });
    });
    
    test('should reset the timer and update reset events', async () => {
      const response = await agent.post('/api/timer/reset');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Check that the new expiration time is updated
      const newExpiryTime = new Date(response.body.newExpirationTime).getTime();
      expect(newExpiryTime).toBeGreaterThan(Date.now() + 150000); // At least 2.5 minutes in the future
      
      // Check that the database was updated
      const state = await State.findById('timer_state');
      expect(state.resetEvents.last24Hours).toBe(6);
      expect(state.resetEvents.total).toBe(11);
      expect(new Date(state.currentState).getTime()).toBe(newExpiryTime);
    });
  });
});
```

### Step 8: Create end-to-end tests for timer flow

```javascript
// tests/e2e/timer-flow.test.js
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

describe('Timer Flow End-to-End Test', () => {
  let browser;
  let page;
  
  // Helper function to wait for a specific time
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Start the server and browser before tests
  beforeAll(async () => {
    // Start the application server
    await execAsync('npm run dev', { env: { ...process.env, PORT: 3001 } });
    
    // Give the server time to start
    await wait(5000);
    
    // Launch the browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
  });
  
  // Clean up after tests
  afterAll(async () => {
    await browser.close();
    
    // Kill the server
    await execAsync('npx kill-port 3001');
  });
  
  test('Timer flow from login to reset to expiration', async () => {
    // Set a short timeout for testing
    await page.evaluate(() => {
      window.localStorage.setItem('TIMER_INITIAL_MINUTES', '0.5');
    });
    
    // Login
    await page.goto('http://localhost:3001/login');
    await page.waitForSelector('#userName');
    await page.type('#userName', 'testuser');
    
    // Enter PIN
    const pinInputs = await page.$$('.pinInput');
    for (let i = 0; i < pinInputs.length; i++) {
      await pinInputs[i].type((i + 1).toString());
    }
    
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('.dashboardContainer');
    
    // Verify dashboard components are present
    expect(await page.$('.currentTimeCard')).not.toBeNull();
    expect(await page.$('.estimatedExpirationCard')).not.toBeNull();
    expect(await page.$('.timeRemainingCard')).not.toBeNull();
    expect(await page.$('.resetEventsCard')).not.toBeNull();
    
    // Click reset button
    await page.click('.resetButton');
    
    // Verify timer resets
    await page.waitForSelector('.resetEventsCard');
    const resetEvents = await page.$eval('.resetEventsCard', el => el.textContent);
    expect(resetEvents).toContain('1'); // At least one reset event
    
    // Wait for timer to expire (a bit more than 30 seconds for 0.5 minute timer)
    await wait(35000);
    
    // Should redirect to message test page
    await page.waitForSelector('.messageTestContainer');
    
    // Verify message test page components
    expect(await page.$('.messageStatus')).not.toBeNull();
    expect(await page.$('.messageTriggerTime')).not.toBeNull();
    
    // Wait for lag timer to expire
    await wait(65000); // A bit more than 1 minute for lag timer
    
    // Verify message sent status
    const messageStatus = await page.$eval('.messageStatus', el => el.textContent);
    expect(messageStatus).toContain('Message Sent');
  }, 120000); // Extend timeout for this test
});
```

### Step 9: Create test script for WebSocket events

```javascript
// tests/scripts/test-websocket.js
const socketIO = require('socket.io-client');
const readline = require('readline');
const colors = require('colors/safe');

// Create command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create socket client
const socket = socketIO('http://localhost:3000', {
  path: '/api/socketio',
  reconnection: true,
  timeout: 10000,
});

// Initialize user session
let userName = 'test-user';

// Handle connection events
socket.on('connect', () => {
  console.log(colors.green(`Connected to WebSocket server with ID: ${socket.id}`));
  socket.emit('authenticate', { userName });
  
  // Display help menu
  showHelp();
});

socket.on('disconnect', () => {
  console.log(colors.red('Disconnected from WebSocket server'));
});

socket.on('connect_error', (error) => {
  console.log(colors.red(`Connection error: ${error.message}`));
});

// Register event listeners
const events = [
  'timer-reset',
  'timer-expired',
  'message-timer-started',
  'message-timer-expired'
];

events.forEach(event => {
  socket.on(event, (data) => {
    console.log(colors.cyan(`\nReceived event: ${event}`));
    console.log(colors.yellow('Event data:'), data);
  });
});

// Command handling
function showHelp() {
  console.log(colors.magenta('\n=== WebSocket Test Client ==='));
  console.log('Available commands:');
  console.log('  help                        Show this help menu');
  console.log('  simulate <event-name>       Simulate a WebSocket event');
  console.log('  user <username>             Change the authenticated user');
  console.log('  reconnect                   Reconnect to the WebSocket server');
  console.log('  exit                        Exit the test client');
  console.log('\nAvailable events to simulate:');
  events.forEach(event => console.log(`  ${event}`));
  console.log('');
}

function handleCommand(input) {
  const args = input.trim().split(' ');
  const cmd = args[0].toLowerCase();
  
  switch (cmd) {
    case 'help':
      showHelp();
      break;
      
    case 'simulate':
      if (!args[1]) {
        console.log(colors.red('Error: Event name is required'));
        return;
      }
      
      if (!events.includes(args[1])) {
        console.log(colors.red(`Error: Unknown event "${args[1]}"`));
        return;
      }
      
      socket.emit('simulate-event', {
        type: args[1],
        data: {
          // Sample data for simulation
          resetBy: userName,
          newExpirationTime: new Date(Date.now() + 180000),
          resetTime: new Date(),
          expiredAt: new Date(),
          triggerTime: new Date(Date.now() + 60000),
          lagTimeMinutes: 1
        }
      });
      
      console.log(colors.green(`Simulation of "${args[1]}" event requested`));
      break;
      
    case 'user':
      if (!args[1]) {
        console.log(colors.red('Error: Username is required'));
        return;
      }
      
      userName = args[1];
      socket.emit('authenticate', { userName });
      console.log(colors.green(`Authenticated as "${userName}"`));
      break;
      
    case 'reconnect':
      socket.disconnect();
      socket.connect();
      break;
      
    case 'exit':
      console.log(colors.green('Exiting WebSocket test client'));
      socket.disconnect();
      rl.close();
      process.exit(0);
      break;
      
    default:
      console.log(colors.red(`Unknown command: ${cmd}`));
      console.log('Type "help" to see available commands');
  }
}

// Start command line interface
rl.setPrompt('> ');
rl.prompt();

rl.on('line', (input) => {
  handleCommand(input);
  rl.prompt();
});

rl.on('close', () => {
  socket.disconnect();
  process.exit(0);
});
```

### Step 10: Implement error boundary component for React

```javascript
// app/components/shared/ErrorBoundary.jsx
import { Component } from 'react';
import { logger } from '../../lib/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log the error
    logger.error('UI Error caught by ErrorBoundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
    
    this.setState({
      errorInfo
    });
    
    // Report the error to monitoring service (if any)
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      // Render fallback UI
      const { fallback } = this.props;
      
      if (fallback) {
        return fallback(this.state.error, this.state.errorInfo);
      }
      
      // Default error display
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but there was an error. Please try refreshing the page.</p>
          {this.props.showDetails && (
            <details>
              <summary>Error Details</summary>
              <p>{this.state.error && this.state.error.toString()}</p>
              <pre>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          {this.props.resetErrorBoundary && (
            <button onClick={this.props.resetErrorBoundary}>
              Reset
            </button>
          )}
        </div>
      );
    }
    
    // If no error, render children
    return this.props.children;
  }
}

export default ErrorBoundary;
```

## Notes to Future You

1. **Testing Philosophy**
   - Unit tests should be fast and focus on individual functions/utilities
   - Integration tests verify that components work together correctly
   - E2E tests validate complete user flows with real browser interaction
   - Always test both success and failure paths

2. **Error Handling Best Practices**
   - Use the AppError class for operational errors with appropriate status codes
   - Wrap critical functions in withRetry for automatic retry with exponential backoff
   - Always validate input data before processing
   - Log errors with enough context to diagnose the issue

3. **Database Interaction Safety**
   - Use withDbRetry for all database operations that need reliability
   - Always include proper validation before database updates
   - Handle connection errors gracefully with reconnection logic
   - Use transactions for operations that require atomicity

4. **Critical Operations Recovery**
   - Timer expiration should be resilient to server restarts
   - Message sending should retry with appropriate delays
   - Always update the database before emitting WebSocket events
   - Implement proper cleanup processes for hanging operations

5. **Monitoring and Diagnostics**
   - Set up comprehensive logging for all error conditions
   - Consider implementing application metrics for critical flows
   - Create health check endpoints for monitoring service availability
   - Periodically audit and analyze error logs to identify recurring issues 