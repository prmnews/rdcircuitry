import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { State, Event, User } from '../models';
import { SocketEvents } from '../websocket/socket-manager';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';

// Create interface for request with user
interface AuthRequest extends Request {
  user?: {
    _id: string;
    userName: string;
    role: string;
  };
}

// Create router
const router = express.Router();

/**
 * @route GET /api/timer/check-expiry
 * @desc Check if timer has expired and get current state
 * @access Private
 */
// @ts-ignore - Express typings issue
router.get('/check-expiry', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Get current state from database
    const state = await State.getCurrentState();
    
    // If no state exists, create one
    if (!state) {
      console.log('⚠️ No timer state found, creating default state');
      const newState = new State({
        _id: 'timer_state',
        currentState: new Date(),
        isRDI: false,
        resetEvents: {
          last24Hours: 0,
          total: 0
        }
      });
      await newState.save();
      
      res.status(200).json({
        success: true,
        isExpired: false,
        isRDI: false,
        targetTime: newState.currentState.toISOString(),
        now: new Date().toISOString(),
        resetEvents: {
          last24Hours: 0,
          total: 0
        }
      });
      return;
    }
    
    // Check if timer has expired
    const isExpired = State.isExpired(state);
    
    // Get reset events counts
    const last24Hours = await Event.getRecentResets(24);
    
    // Add reset events to response if not in state
    const resetEvents = {
      last24Hours: state.resetEvents?.last24Hours || last24Hours,
      total: state.resetEvents?.total || (await Event.countDocuments({ eventType: 'TIMER_RESET' }))
    };
    
    // Return state
    res.status(200).json({
      success: true,
      isExpired,
      isRDI: state.isRDI,
      targetTime: state.currentState.toISOString(),
      now: new Date().toISOString(),
      resetEvents
    });
  } catch (error) {
    console.error('❌ Check timer expiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking timer expiry'
    });
  }
});

/**
 * @route POST /api/timer/reset
 * @desc Reset the timer
 * @access Private
 */
// @ts-ignore - Express typings issue
router.post('/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const userName = req.user?.userName || 'system';
    
    // Get current state
    let state = await State.getCurrentState();
    
    // If no state exists, create one
    if (!state) {
      state = new State({
        _id: 'timer_state',
        currentState: new Date(),
        isRDI: false,
        resetEvents: {
          last24Hours: 0,
          total: 0
        }
      });
    }
    
    // Calculate new expiration time (using env config instead of hardcoded 5 minutes)
    const now = new Date();
    const initialMinutes = parseInt(process.env.TIMER_INITIAL_MINUTES || '3', 10);
    const newExpirationTime = new Date(now.getTime() + (initialMinutes * 60 * 1000));
    
    // Calculate remainder between now and previous expiration (in seconds)
    // Negative remainder means timer expired, positive means time left
    let remainder = 0;
    if (state.currentState) {
      const expiration = new Date(state.currentState);
      remainder = Math.round((expiration.getTime() - now.getTime()) / 1000);
    }
    
    // Update state
    state.currentState = newExpirationTime;
    state.isRDI = false;
    state.resetEvents.total += 1;
    
    // Update last 24 hours count
    const last24Hours = await Event.getRecentResets(24);
    state.resetEvents.last24Hours = last24Hours + 1;
    
    await state.save();
    
    // Log event
    const user = await User.findOne({ userName });
    const location = user?.location || {
      countryCode: 'US',
      countryName: 'United States',
      timeZone: 'America/Los_Angeles',
      gmtOffset: '-480'
    };
    
    // Create event in database with proper remainder
    await Event.logTimerReset({
      userName,
      location,
      remainder,
      details: {
        reason: reason || 'Manual reset from dashboard',
        remainder
      }
    });
    
    // Emit WebSocket event with socketManager
    if (typeof global !== 'undefined' && global.socketManager) {
      global.socketManager.emitTimerReset({
        resetBy: userName,
        resetTime: now.toISOString(),
        newExpirationTime: newExpirationTime.toISOString(),
        reason: reason || 'Manual reset from dashboard',
        remainder
      });
    } else {
      console.warn('Socket manager not available for timer reset event');
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      newExpirationTime: newExpirationTime.toISOString(),
      resetBy: userName,
      resets: {
        last24Hours: state.resetEvents.last24Hours,
        total: state.resetEvents.total
      }
    });
  } catch (error) {
    console.error('❌ Reset timer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting timer'
    });
  }
});

/**
 * @route GET /api/timer/history
 * @desc Get time remaining data grouped by hour of day
 * @access Private
 */
// @ts-ignore - Express typings issue
router.get('/history', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const Event = mongoose.model('Event');
    
    // Get current date
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Find reset events for the last 24 hours
    const events = await Event.find({
      eventType: 'TIMER_RESET',
      trueDateTime: { $gte: yesterday, $lte: now }
    }).sort({ trueDateTime: 1 });
    
    // Initialize data array with 0 values for all 24 hours
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      value: 0,
      count: 0
    }));
    
    // Process events to get time remaining by hour
    events.forEach(event => {
      const eventDate = new Date(event.trueDateTime);
      const hour = eventDate.getHours();
      
      // Parse remainder from details
      let remainder = 0;
      if (event.details) {
        const details = typeof event.details === 'string' 
          ? JSON.parse(event.details) 
          : event.details;
        
        if (details?.remainder !== undefined) {
          // Convert seconds to minutes (always use absolute value)
          remainder = Math.abs(details.remainder) / 60;
        }
      }
      
      // Update the value for this hour
      const hourData = hourlyData.find(item => item.hour === hour);
      if (hourData) {
        hourData.value += remainder;
        hourData.count += 1;
      }
    });
    
    // Calculate averages for each hour and remove the count property
    const result = hourlyData.map(hourData => ({
      hour: hourData.hour,
      value: hourData.count > 0 ? hourData.value / hourData.count : 0
    }));
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching timer history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching timer history'
    });
  }
});

export default router; 