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
      res.status(400).json({ 
        success: false,
        message: 'Message feature is disabled in environment configuration' 
      });
      return;
    }
    
    // Check if timer has expired
    const state = await State.findOne({ _id: 'timer_state' });
    
    if (!state) {
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
    
    if (!isExpired) {
      res.status(400).json({ 
        success: false,
        message: 'Cannot start message timer when main timer is not expired' 
      });
      return;
    }
    
    if (state.isRDI) {
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
    
    const messageContent = constructMessage();
    
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
      res.status(500).json({ 
        success: false,
        message: 'Failed to create message timer' 
      });
      return;
    }
    
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
    res.status(500).json({ 
      success: false,
      message: 'Failed to start message timer' 
    });
  }
});

// Process message (for scheduled jobs)
router.post('/process', async (req: Request, res: Response): Promise<void> => {
  try {
    
    // Validate webhook secret
    const secretToken = req.header('x-webhook-secret');
    if (secretToken !== process.env.MESSAGE_WEBHOOK_SECRET) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
      return;
    }
    
    // Get active message timer
    const messageTimer = await MessageTimer.findOne({ _id: 'message_timer', active: true });
    
    if (!messageTimer) {
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
    
    if (currentTime < triggerTime) {
      const remainingTime = triggerTime.getTime() - currentTime.getTime();
      res.json({
        success: true,
        message: 'Message timer not yet expired',
        processed: false,
        remainingTime: remainingTime
      });
      return;
    }
    
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
    
    // Process message
    const messageResult = await broadcastMessage(messageTimer.messageContent);
    
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
    
    // Deactivate timer
    await MessageTimer.findOneAndUpdate(
      { _id: 'message_timer' },
      { $set: { active: false, updatedAt: currentTime } }
    );
    
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
    
    // Return response
    res.json({
      success: true,
      message: 'Message timer processed',
      result: messageResult
    });
    return;
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to process message timer' 
    });
  }
});

// Get current message timer status
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const messageTimer = await MessageTimer.findOne({ _id: 'message_timer', active: true });
    
    if (!messageTimer) {
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
    res.status(500).json({ 
      success: false,
      message: 'Failed to get message timer status' 
    });
  }
});

export default router; 