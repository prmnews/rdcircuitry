import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth';

// Add interfaces for User and Event
interface UserDocument {
  _id: mongoose.Types.ObjectId;
  userName: string;
  role: string;
  location?: any;
}

interface EventDocument {
  details: string | any;
  userName: string;
  eventType: string;
  trueDateTime: Date;
}

const router = express.Router();

/**
 * @route GET /api/users/kpi-stats
 * @desc Get KPI statistics for user timer resets
 * @access Private (any authenticated user)
 */
// @ts-ignore - Express typings issue
router.get('/kpi-stats', authenticateToken, async (req, res) => {
  try {
    // Get models
    const User = mongoose.model<UserDocument>('User');
    const Event = mongoose.model<EventDocument>('Event');
    
    // Get all users
    const users = await User.find({}, 'userName role location');
    
    // Calculate KPI stats for each user
    const userStats = await Promise.all(
      users.map(async (user: UserDocument) => {
        // Get timer reset events for this user
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const timerResets = await Event.find({
          userName: user.userName,
          eventType: 'TIMER_RESET',
          trueDateTime: { $gte: oneDayAgo }
        }).sort({ trueDateTime: 1 });
        
        if (timerResets.length === 0) {
          return {
            id: user._id.toString(),
            userName: user.userName,
            minRemainder: 0,
            avgRemainder: 0,
            maxRemainder: 0,
            totalResets: 0
          };
        }
        
        // Calculate min, avg, max remainder times
        let totalRemainder = 0;
        let minRemainder = Number.MAX_VALUE;
        let maxRemainder = 0;
        let validRemainderCount = 0;
        
        timerResets.forEach((event: EventDocument) => {
          let remainder = 0;
          
          // Extract remainder from event details
          if (event.details) {
            const details = typeof event.details === 'string' 
              ? JSON.parse(event.details) 
              : event.details;
              
            if (details?.remainder !== undefined) {
              // Convert seconds to minutes and use absolute value to handle negative values
              remainder = Math.abs(details.remainder) / 60;
              
              minRemainder = Math.min(minRemainder, remainder);
              maxRemainder = Math.max(maxRemainder, remainder);
              totalRemainder += remainder;
              validRemainderCount++;
            }
          }
        });
        
        // If no valid remainder values were found
        if (minRemainder === Number.MAX_VALUE) {
          minRemainder = 0;
        }
        
        return {
          id: user._id.toString(),
          userName: user.userName,
          minRemainder,
          avgRemainder: validRemainderCount > 0 ? totalRemainder / validRemainderCount : 0,
          maxRemainder,
          totalResets: timerResets.length
        };
      })
    );
    
    // Return KPI stats
    res.status(200).json({
      success: true,
      users: userStats
    });
    
  } catch (error) {
    console.error('Error fetching user KPI stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user statistics' 
    });
  }
});

export default router; 