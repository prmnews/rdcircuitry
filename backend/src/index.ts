import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectToDatabase } from './lib/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import timerRoutes from './routes/timer.routes';
import { SocketManager } from './websocket/socket-manager';
import { SERVER_CONFIG, validateConfig } from './config';

// Import models to ensure they're registered with Mongoose
import './models';

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: [SERVER_CONFIG.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timer', timerRoutes);

// Basic health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket server
const io = new Server(server, {
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
    
    // Then start server
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} in ${SERVER_CONFIG.NODE_ENV} mode`);
      console.log(`🔗 Frontend URL: ${SERVER_CONFIG.FRONTEND_URL}`);
      console.log('🌐 Ready to accept connections');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
