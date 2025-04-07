import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Request, Response, RequestHandler } from 'express';
import request from 'supertest';
import cors from 'cors';
import authRoutes from '../routes/auth.routes';
import jwt from 'jsonwebtoken';
import { SECURITY_CONFIG } from '../config';

// Import models to ensure they're registered
import '../models';

// Add type for decoded user from JWT
interface JwtUser {
  _id: string;
  userName: string;
  role: string;
}

// Extend express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

describe('Timer API Tests', () => {
  let mongod: MongoMemoryServer;
  let app: express.Application;
  let authToken: string;
  let userId: string;
  
  // Setup the test server and database before all tests
  beforeAll(async () => {
    // Set up the memory MongoDB server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    console.log('Connecting to in-memory MongoDB...');
    await mongoose.connect(uri, { dbName: 'test-db' });
    console.log('Connected to in-memory MongoDB');
    
    // Create test user for authentication
    const User = mongoose.model('User');
    const user = await User.create({
      userName: 'stownsend',
      pinNumber: '1234',
      role: 'admin',
      location: {
        countryCode: 'US',
        countryName: 'United States',
        timeZone: 'America/Los_Angeles',
        gmtOffset: '-08:00'
      }
    });
    userId = user._id.toString();
    console.log('Created test user');
    
    // Set up Express app with mock routes
    app = express();
    app.use(express.json());
    app.use(cors());
    
    // Set up basic auth routes for login
    app.use('/api/auth', authRoutes);
    
    // Set up mock timer routes
    const timerRoutes = express.Router();
    
    // Timer check-expiry endpoint
    // @ts-ignore - Express typings issue
    timerRoutes.get('/check-expiry', async (req, res) => {
      try {
        const State = mongoose.model('State');
        const currentState = await State.findOne({ _id: 'timer_state' });
        
        if (!currentState) {
          res.status(404).json({ 
            success: false, 
            message: 'Timer state not found' 
          });
          return;
        }
        
        const now = new Date();
        const targetTime = currentState.currentState;
        const isExpired = targetTime < now;
        const remainingTime = isExpired ? 0 : targetTime.getTime() - now.getTime();
        
        res.status(200).json({
          success: true,
          isExpired,
          isRDI: currentState.isRDI,
          remainingTime,
          targetTime,
          now
        });
      } catch (error) {
        console.error('Error checking timer expiry:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Server error checking timer state' 
        });
      }
    });
    
    // Timer reset endpoint (requires auth)
    // @ts-ignore - Express typings issue
    timerRoutes.post('/reset', async (req, res) => {
      try {
        // Check for auth token
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
          res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
          });
          return;
        }
        
        // Verify token
        try {
          const secret = SECURITY_CONFIG.JWT_SECRET || 'test-jwt-secret';
          const decoded = jwt.verify(token, secret) as JwtUser;
          req.user = decoded;
        } catch (error) {
          res.status(403).json({ 
            success: false, 
            message: 'Invalid token' 
          });
          return;
        }
        
        // Reset timer
        const State = mongoose.model('State');
        const currentState = await State.findOne({ _id: 'timer_state' });
        
        if (!currentState) {
          res.status(404).json({ 
            success: false, 
            message: 'Timer state not found' 
          });
          return;
        }
        
        // Set new expiration time (3 minutes from now)
        const newExpirationTime = new Date(Date.now() + 3 * 60 * 1000);
        currentState.currentState = newExpirationTime;
        
        // Update reset events
        if (!currentState.resetEvents) {
          currentState.resetEvents = { last24Hours: 0, total: 0 };
        }
        
        currentState.resetEvents.last24Hours += 1;
        currentState.resetEvents.total += 1;
        
        await currentState.save();
        
        res.status(200).json({
          success: true,
          message: 'Timer reset successfully',
          newExpirationTime,
          resetBy: req.user.userName,
          resets: currentState.resetEvents
        });
      } catch (error) {
        console.error('Error resetting timer:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Server error resetting timer' 
        });
      }
    });
    
    // Message start endpoint (requires auth)
    // @ts-ignore - Express typings issue
    timerRoutes.post('/message/start', async (req, res) => {
      try {
        // Check for auth token
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
          res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
          });
          return;
        }
        
        // Verify token
        try {
          const secret = SECURITY_CONFIG.JWT_SECRET || 'test-jwt-secret';
          const decoded = jwt.verify(token, secret) as JwtUser;
          req.user = decoded;
        } catch (error) {
          res.status(403).json({ 
            success: false, 
            message: 'Invalid token' 
          });
          return;
        }
        
        // Create message timer
        const MessageTimer = mongoose.model('MessageTimer');
        
        // Set trigger time (90 seconds from now)
        const triggerTime = new Date(Date.now() + 90 * 1000);
        
        const messageTimer = await MessageTimer.create({
          _id: 'message_timer',
          triggerTime,
          active: true,
          messageContent: {
            text: 'Test message generated at ' + new Date().toISOString(),
            url: req.body.url || 'https://example.com/test'
          }
        });
        
        res.status(200).json({
          success: true,
          message: 'Message timer started',
          timer: {
            triggerTime: messageTimer.triggerTime,
            remainingTime: triggerTime.getTime() - Date.now(),
            messageContent: messageTimer.messageContent
          }
        });
      } catch (error) {
        console.error('Error starting message timer:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Server error starting message timer' 
        });
      }
    });
    
    // Register timer routes
    app.use('/api/timer', timerRoutes);
    
    // Generate JWT token for authenticated requests
    const secret = SECURITY_CONFIG.JWT_SECRET || 'test-jwt-secret';
    authToken = jwt.sign(
      { _id: userId, userName: 'stownsend', role: 'admin' },
      secret,
      { expiresIn: '1h' }
    );
    console.log('Generated auth token for tests');
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // Drop database and close connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongod) {
      await mongod.stop();
    }
    
    console.log('Test cleanup complete');
  });
  
  // Reset database between tests
  beforeEach(async () => {
    // Clear all collections except User
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (key !== 'users') {
        await collections[key].deleteMany({});
      }
    }
  });
  
  describe('Timer Expiry Tests', () => {
    test('should return timer not expired when timer is active', async () => {
      // Create non-expired timer state (3 minutes in the future)
      const State = mongoose.model('State');
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() + 3 * 60 * 1000),
        isRDI: false,
        resetEvents: {
          last24Hours: 0,
          total: 0
        }
      });
      
      const res = await request(app).get('/api/timer/check-expiry');
      
      console.log('Non-expired timer response:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isExpired).toBe(false);
      expect(res.body.remainingTime).toBeGreaterThan(0);
      
      // Verify target time is in the future
      const targetTime = new Date(res.body.targetTime).getTime();
      const now = new Date(res.body.now).getTime();
      expect(targetTime).toBeGreaterThan(now);
    });
    
    test('should return timer expired when timer is expired', async () => {
      // Create expired timer state (1 minute in the past)
      const State = mongoose.model('State');
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() - 1 * 60 * 1000),
        isRDI: false,
        resetEvents: {
          last24Hours: 0,
          total: 0
        }
      });
      
      const res = await request(app).get('/api/timer/check-expiry');
      
      console.log('Expired timer response:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isExpired).toBe(true);
      
      // Verify target time is in the past
      const targetTime = new Date(res.body.targetTime).getTime();
      const now = new Date(res.body.now).getTime();
      expect(targetTime).toBeLessThan(now);
    });
  });
  
  describe('Timer Reset Tests', () => {
    test('should reset the timer successfully', async () => {
      // Create expired timer state
      const State = mongoose.model('State');
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() - 1 * 60 * 1000), // 1 minute in the past
        isRDI: false,
        resetEvents: {
          last24Hours: 5,
          total: 10
        }
      });
      
      const res = await request(app)
        .post('/api/timer/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Testing timer reset functionality'
        });
      
      console.log('Timer reset response:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Timer reset successfully');
      expect(res.body.newExpirationTime).toBeDefined();
      expect(res.body.resetBy).toBe('stownsend');
      expect(res.body.resets).toBeDefined();
      expect(res.body.resets.last24Hours).toBe(6);
      expect(res.body.resets.total).toBe(11);
      
      // Verify new expiration time is in the future
      const newExpiryTime = new Date(res.body.newExpirationTime).getTime();
      const now = Date.now();
      expect(newExpiryTime).toBeGreaterThan(now);
    });
    
    test('should fail to reset timer without authentication', async () => {
      // Create expired timer state
      const State = mongoose.model('State');
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() - 1 * 60 * 1000), // 1 minute in the past
        isRDI: false,
        resetEvents: {
          last24Hours: 5,
          total: 10
        }
      });
      
      const res = await request(app)
        .post('/api/timer/reset')
        .send({
          reason: 'Testing timer reset functionality'
        });
      
      console.log('Failed timer reset response:', res.body);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication required');
    });
  });
  
  describe('Message Timer Tests', () => {
    test('should start message timer successfully', async () => {
      // Create expired timer state first (since messages are only for expired state)
      const State = mongoose.model('State');
      await State.create({
        _id: 'timer_state',
        currentState: new Date(Date.now() - 1 * 60 * 1000), // 1 minute in the past
        isRDI: false,
        resetEvents: {
          last24Hours: 0,
          total: 0
        }
      });
      
      const res = await request(app)
        .post('/api/timer/message/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/test-message'
        });
      
      console.log('Message timer start response:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Message timer started');
      expect(res.body.timer).toBeDefined();
      expect(res.body.timer.triggerTime).toBeDefined();
      expect(res.body.timer.remainingTime).toBeGreaterThan(0);
      expect(res.body.timer.messageContent).toBeDefined();
      expect(res.body.timer.messageContent.url).toBe('https://example.com/test-message');
      
      // Verify trigger time is in the future
      const triggerTime = new Date(res.body.timer.triggerTime).getTime();
      const now = Date.now();
      expect(triggerTime).toBeGreaterThan(now);
    });
  });
}); 