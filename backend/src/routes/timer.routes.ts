import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { State, Event, User } from '../models';
import { SocketEvents } from '../websocket/socket-manager';
import type { Request, Response } from 'express';

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
    
    // Create event with default remainder of 0
    const remainder = 0;
    
    // Create event in database
    await Event.logTimerReset({
      userName,
      location,
      remainder,
      details: {
        reason: reason || 'Manual reset from dashboard',
        remainder
      }
    });
    
    // Emit socket event if socketManager available
    if (global.socketManager) {
      global.socketManager.emitTimerReset({
        resetBy: userName,
        newExpirationTime: newExpirationTime.toISOString(),
        resetTime: now.toISOString(),
        reason: reason || 'Manual reset from dashboard'
      });
    }
    
    // Return success
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

export default router; 