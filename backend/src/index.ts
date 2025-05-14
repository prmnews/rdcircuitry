import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectToDatabase } from './lib/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import timerRoutes from './routes/timer.routes';
import messageRoutes from './routes/message.routes';
import { SocketManager } from './websocket/socket-manager';
import { SERVER_CONFIG, validateConfig } from './config';
import { MessageTimer, State, Event } from './models';
import { broadcastMessage } from './lib/message/broadcast';

// Define the broadcast result interface
interface BroadcastResult {
  success: boolean;
  tweetId?: string;
  error?: string;
  createdAt: Date;
  mock?: boolean;
}

// Import models to ensure they're registered with Mongoose
import './models';

// Create Express app
const app = express();
const server = http.createServer(app);
const websocketHttpServer = http.createServer(); // Create a dedicated server for WebSockets

// Middleware
app.use(cors({
  origin: [SERVER_CONFIG.FRONTEND_URL, 
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://*.replit.app',
    'https://*.repl.co',
    'http://34.83.203.60',
    'https://34.83.203.60'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/message', messageRoutes);

// Basic health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket server
const io = new Server(websocketHttpServer, { // Attach Socket.IO to the dedicated WebSocket server
  cors: {
    origin: [SERVER_CONFIG.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket manager
const socketManager = new SocketManager(io);

// Declare global IO instance
declare global {
  var socketIo: Server;
  var socketManager: SocketManager;
}

// Make io and socketManager instances globally available
global.socketIo = io;
global.socketManager = socketManager;

// Start server
const PORT = parseInt(SERVER_CONFIG.PORT, 10);
const WEBSOCKET_PORT = parseInt(SERVER_CONFIG.WEBSOCKET_PORT, 10);

// Before startServer function
// Add a task to check and process expired message timers
function setupMessageTimerChecker() {
  const MESSAGE_CHECK_INTERVAL = parseInt(process.env.MESSAGE_CHECK_INTERVAL_MS || '10000', 10); // Default: 10 seconds
  
  console.log(`📬 Setting up message timer checker to run every ${MESSAGE_CHECK_INTERVAL}ms`);
  
  // Process message function (internal version that doesn't require external HTTP calls)
  const processExpiredMessageTimers = async () => {
    try {
      // Find active message timer
      const messageTimer = await MessageTimer.findOne({ _id: 'message_timer', active: true });
      
      if (!messageTimer) {
        return;
      }
      
      // Check if timer has expired
      const currentTime = new Date();
      const triggerTime = new Date(messageTimer.triggerTime);
      
      // Skip if not expired yet
      if (currentTime < triggerTime) {
        return;
      }
      
      console.log('🔴 DEBUGGING: Message timer has expired, processing...');
      
      // Log sending event
      await Event.create({
        userName: 'system',
        isUserValidation: false,
        eventType: 'MESSAGE_SENDING',
        location: { countryCode: 'US', countryName: 'United States' },
        trueDateTime: currentTime,
        processed: true,
        details: JSON.stringify(messageTimer.messageContent)
      });
      
      console.log('🔴 DEBUGGING: Sending message via X.com API');
      // Process message
      const messageResult = await broadcastMessage(messageTimer.messageContent) as BroadcastResult;
      
      // Update state to mark as done
      await State.findOneAndUpdate(
        { _id: 'timer_state' },
        { $set: { isRDI: true, updatedAt: currentTime } }
      );
      
      console.log('🔴 DEBUGGING: Updated state.isRDI to true');
      
      // Deactivate timer
      await MessageTimer.findOneAndUpdate(
        { _id: 'message_timer' },
        { $set: { active: false, updatedAt: currentTime } }
      );
      
      console.log('🔴 DEBUGGING: Deactivated message timer');
      
      // Log result event
      await Event.create({
        userName: 'system',
        isUserValidation: false,
        eventType: messageResult.success ? 'MESSAGE_SENT' : 'MESSAGE_FAILED',
        location: { countryCode: 'US', countryName: 'United States' },
        trueDateTime: currentTime,
        processed: true,
        details: JSON.stringify({
          messageContent: messageTimer.messageContent,
          result: messageResult
        })
      });
      
      console.log(`🔴 DEBUGGING: Message processed - result: ${messageResult.success ? 'SUCCESS' : 'FAILURE'}`);
    } catch (error) {
      console.error('Error processing message timer:', error);
    }
  };
  
  // Start the interval
  const intervalId = setInterval(processExpiredMessageTimers, MESSAGE_CHECK_INTERVAL);
  
  // Return a cleanup function
  return () => clearInterval(intervalId);
}

async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting RDCircuitry server...');
    
    // Validate config first
    console.log('🔍 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration valid');
    
    // Connect to database 
    console.log('🔌 Connecting to MongoDB...');
    await connectToDatabase();
    
    // Setup message timer checker
    setupMessageTimerChecker();
    
    // Then start server
    server.listen(PORT, () => {
      console.log(`✅ API Server running on port ${PORT} in ${SERVER_CONFIG.NODE_ENV} mode`);
      console.log(`🔗 Frontend URL: ${SERVER_CONFIG.FRONTEND_URL}`);
      console.log('🌐 API Ready to accept connections');
    });

    websocketHttpServer.listen(WEBSOCKET_PORT, () => {
      console.log(`✅ WebSocket Server running on port ${WEBSOCKET_PORT}`);
      console.log('🌐 WebSocket Ready to accept connections');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
