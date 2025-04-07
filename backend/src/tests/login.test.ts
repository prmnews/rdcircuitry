import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';
import cors from 'cors';
import authRoutes from '../routes/auth.routes';

// Import models to ensure they're registered
import '../models';

describe('Login API Tests', () => {
  let mongod: MongoMemoryServer;
  let app: express.Application;
  let authToken: string;
  
  // Setup the test server and database before all tests
  beforeAll(async () => {
    // Set up the memory MongoDB server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    console.log('Connecting to in-memory MongoDB...');
    await mongoose.connect(uri, { dbName: 'test-db' });
    console.log('Connected to in-memory MongoDB');
    
    // Create test user that matches real data
    const User = mongoose.model('User');
    await User.create({
      userName: 'stownsend',
      pinNumber: '1234', // Using known test PIN
      role: 'admin',
      location: {
        countryCode: 'US',
        countryName: 'United States',
        timeZone: 'America/Los_Angeles',
        gmtOffset: '-08:00'
      }
    });
    console.log('Created test user');
    
    // Set up Express app
    app = express();
    app.use(express.json());
    app.use(cors());
    app.use('/api/auth', authRoutes);
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
  
  describe('User Login', () => {
    test('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          userName: 'stownsend',
          pinNumber: '1234'
        });
      
      console.log('Login response:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.userName).toBe('stownsend');
      expect(res.body.user.role).toBe('admin');
      
      // Save the token for subsequent tests
      authToken = res.body.token;
    });
    
    test('should fail login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          userName: 'stownsend',
          pinNumber: 'wrongpin'
        });
      
      console.log('Failed login response:', res.body);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('Get Current User', () => {
    test('should get current user with valid token', async () => {
      // Make sure we have a token from the login test
      expect(authToken).toBeDefined();
      
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      console.log('User info response:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.userName).toBe('stownsend');
      expect(res.body.user.role).toBe('admin');
    });
    
    test('should fail to get user with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      console.log('Failed user info response:', res.body);
      expect(res.status).toBe(403);
      expect(res.body.message).toBeDefined();
    });
  });
}); 