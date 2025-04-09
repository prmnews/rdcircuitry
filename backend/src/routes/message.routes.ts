import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import { State, Event, MessageTimer } from '../models';

// For TypeScript, create interfaces for constructMessage and broadcastMessage
interface MessageContent {
  text: string;
  url?: string;
}

interface MessageResult {
  success: boolean;
  tweetId?: string;
  error?: string;
  createdAt: Date;
}

// Use require for JS modules that don't have TypeScript declarations
const { constructMessage } = require('../lib/message/constructor');
const { broadcastMessage } = require('../lib/message/broadcast');

const router = express.Router();

// User interface to match your existing implementation
interface AuthenticatedUser {
  _id: string;
  userName: string;
  role: string;
  location?: {
    countryCode: string;
    countryName: string;
  };
}

// Extend Request with your user type
interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Middleware to protect routes - using NextFunction type from express
const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    const secret = process.env.JWT_SECRET || 'default-jwt-secret';
    try {
      const decoded = jwt.verify(token, secret) as AuthenticatedUser;
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
      return;
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
    return;
  }
};

// Start message timer
router.post('/start', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('🔴 DEBUGGING: /message/start endpoint called');
    
    // Check if MESSAGE_ENABLE is true
    if (process.env.MESSAGE_ENABLE !== 'true') {
      console.log('🔴 DEBUGGING: Message feature is disabled in environment');
      res.status(400).json({ 
        success: false,
        message: 'Message feature is disabled in environment configuration' 
      });
      return;
    }
    
    // Check if timer has expired
    const state = await State.findOne({ _id: 'timer_state' });
    
    if (!state) {
      console.log('🔴 DEBUGGING: Timer state not found');
      res.status(404).json({ 
        success: false,
        message: 'Timer state not found' 
      });
      return;
    }
    
    // Check if timer is expired (implementation will vary based on your State model)
    const currentTime = new Date();
    const timerState = new Date(state.currentState);
    const isExpired = timerState <= currentTime;
    
    console.log(`🔴 DEBUGGING: Timer state - Current time: ${currentTime.toISOString()}, Timer state time: ${timerState.toISOString()}, Is expired: ${isExpired}`);
    
    if (!isExpired) {
      console.log('🔴 DEBUGGING: Timer is not expired, cannot start message timer');
      res.status(400).json({ 
        success: false,
        message: 'Cannot start message timer when main timer is not expired' 
      });
      return;
    }
    
    if (state.isRDI) {
      console.log('🔴 DEBUGGING: Message already sent for this timer cycle (isRDI=true)');
      res.status(400).json({ 
        success: false,
        message: 'Message has already been sent for this timer cycle' 
      });
      return;
    }
    
    // Check if there's already an active message timer
    const existingTimer = await MessageTimer.findOne({ _id: 'message_timer', active: true });
    if (existingTimer) {
      const triggerTime = new Date(existingTimer.triggerTime);
      const remainingMs = Math.max(0, triggerTime.getTime() - currentTime.getTime());
      
      console.log(`🔴 DEBUGGING: Message timer already active, trigger time: ${triggerTime.toISOString()}, remaining: ${remainingMs}ms`);
      
      res.json({
        success: true,
        message: 'Message timer already active',
        timer: {
          triggerTime: existingTimer.triggerTime,
          remainingTime: remainingMs,
          messageContent: existingTimer.messageContent
        }
      });
      return;
    }
    
    // Create new message timer
    const lagTimeMinutes = parseFloat(process.env.LAG_TIME_MINUTES || '5');
    const lagTimeMs = lagTimeMinutes * 60 * 1000;
    const triggerTime = new Date(currentTime.getTime() + lagTimeMs);
    
    console.log(`🔴 DEBUGGING: Starting lag timer of ${lagTimeMinutes} minutes (${lagTimeMs}ms)`);
    console.log(`🔴 DEBUGGING: Trigger time will be: ${triggerTime.toISOString()}`);
    
    // Construct message
    console.log('🔴 DEBUGGING: Constructing message content');
    const messageContent = constructMessage();
    
    console.log('🔴 DEBUGGING: Creating/updating message timer in database');
    
    // Create message timer using findOneAndUpdate for DocumentDB compatibility
    const messageTimer = await MessageTimer.findOneAndUpdate(
      { _id: 'message_timer' },
      { 
        $set: {
          triggerTime: triggerTime,
          active: true,
          messageContent: messageContent,
          updatedAt: currentTime
        }
      },
      { upsert: true, new: true }
    );
    
    if (!messageTimer) {
      console.log('🔴 DEBUGGING: Failed to create message timer');
      res.status(500).json({ 
        success: false,
        message: 'Failed to create message timer' 
      });
      return;
    }
    
    console.log(`🔴 DEBUGGING: Message timer created successfully with ID: ${messageTimer._id}`);
    
    // Log event
    await Event.create({
      userName: req.user!.userName,
      isUserValidation: true,
      eventType: 'MESSAGE_SCHEDULED',
      location: req.user!.location || { countryCode: 'US', countryName: 'United States' },
      trueDateTime: currentTime,
      processed: true,
      details: JSON.stringify({
        triggerTime,
        lagTimeMinutes
      })
    });
    
    console.log('🔴 DEBUGGING: Created MESSAGE_SCHEDULED event in database');
    
    // Return response
    res.json({
      success: true,
      message: 'Message timer started',
      timer: {
        triggerTime: messageTimer.triggerTime,
        remainingTime: lagTimeMs,
        messageContent: messageTimer.messageContent
      }
    });
  } catch (error) {
    console.error('🔴 DEBUGGING: Error in /message/start:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to start message timer' 
    });
  }
});

// Process message (for scheduled jobs)
router.post('/process', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔴 DEBUGGING: /message/process endpoint called');
    
    // Validate webhook secret
    const secretToken = req.header('x-webhook-secret');
    if (secretToken !== process.env.MESSAGE_WEBHOOK_SECRET) {
      console.log('🔴 DEBUGGING: Invalid webhook secret');
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
      return;
    }
    
    // Get active message timer
    const messageTimer = await MessageTimer.findOne({ _id: 'message_timer', active: true });
    
    if (!messageTimer) {
      console.log('🔴 DEBUGGING: No active message timer found');
      res.json({
        success: true,
        message: 'No active message timer to process',
        processed: false
      });
      return;
    }
    
    // Check if timer has expired
    const currentTime = new Date();
    const triggerTime = new Date(messageTimer.triggerTime);
    
    console.log(`🔴 DEBUGGING: Checking if timer expired - Current time: ${currentTime.toISOString()}, Trigger time: ${triggerTime.toISOString()}`);
    
    if (currentTime < triggerTime) {
      const remainingTime = triggerTime.getTime() - currentTime.getTime();
      console.log(`🔴 DEBUGGING: Message timer not yet expired, remaining: ${remainingTime}ms`);
      res.json({
        success: true,
        message: 'Message timer not yet expired',
        processed: false,
        remainingTime: remainingTime
      });
      return;
    }
    
    console.log('🔴 DEBUGGING: Message timer has expired, proceeding with broadcast');
    
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
    
    console.log('🔴 DEBUGGING: Created MESSAGE_SENDING event in database');
    
    // Process message
    console.log('🔴 DEBUGGING: Calling broadcastMessage function');
    const messageResult = await broadcastMessage(messageTimer.messageContent);
    
    console.log(`🔴 DEBUGGING: Broadcast result: ${messageResult.success ? 'SUCCESS' : 'FAILURE'}`);
    if (messageResult.tweetId) {
      console.log(`🔴 DEBUGGING: Tweet ID: ${messageResult.tweetId}`);
    }
    if (messageResult.error) {
      console.log(`🔴 DEBUGGING: Error: ${messageResult.error}`);
    }
    
    // Update state - using findOneAndUpdate for DocumentDB compatibility
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
    
    console.log(`🔴 DEBUGGING: Created ${messageResult.success ? 'MESSAGE_SENT' : 'MESSAGE_FAILED'} event in database`);
    
    // Return response
    res.json({
      success: true,
      message: 'Message timer processed',
      result: messageResult
    });
    return;
  } catch (error) {
    console.error('🔴 DEBUGGING: Error in /message/process:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process message timer' 
    });
  }
});

// Get current message timer status
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔴 DEBUGGING: /message/status endpoint called');
    
    const messageTimer = await MessageTimer.findOne({ _id: 'message_timer', active: true });
    
    if (!messageTimer) {
      console.log('🔴 DEBUGGING: No active message timer found');
      res.json({
        success: true,
        timerActive: false,
        message: 'No further action possible. This application has successfuly managed the isRDI state to a true condition.'
      });
      return;
    }
    
    const currentTime = new Date();
    const triggerTime = new Date(messageTimer.triggerTime);
    const remainingMs = Math.max(0, triggerTime.getTime() - currentTime.getTime());
    const remainingSeconds = Math.floor(remainingMs / 1000);
    
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formattedRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    console.log(`🔴 DEBUGGING: Found active message timer, trigger time: ${triggerTime.toISOString()}`);
    console.log(`🔴 DEBUGGING: Remaining time: ${remainingMs}ms (${formattedRemaining})`);
    
    res.json({
      success: true,
      timerActive: true,
      message: 'Timer active',
      timer: {
        triggerTime: messageTimer.triggerTime,
        remainingTime: remainingMs,
        formattedRemaining: formattedRemaining,
        messageContent: messageTimer.messageContent
      }
    });
    return;
  } catch (error) {
    console.error('🔴 DEBUGGING: Error in /message/status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get message timer status' 
    });
  }
});

export default router; 