import express from 'express';
import { AuthService } from '../services/auth.service';
import { authenticateToken } from '../middleware/auth';
// Import types but don't use them in the route handlers
import type { Request, Response } from 'express';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
// @ts-ignore - Express typings issue
router.post('/register', async (req, res) => {
  try {
    const { userName, pinNumber, location, role } = req.body;
    
    // Validate input
    if (!userName || !pinNumber || !location) {
      console.log('❌ Registration failed: Missing required fields');
      res.status(400).json({ 
        success: false, 
        message: 'Please provide userName, pinNumber, and location' 
      });
      return;
    }
    
    // Validate location fields
    if (!location.countryCode || !location.countryName || !location.timeZone || !location.gmtOffset) {
      console.log('❌ Registration failed: Invalid location data');
      res.status(400).json({
        success: false,
        message: 'Location must include countryCode, countryName, timeZone, and gmtOffset'
      });
      return;
    }
    
    const result = await AuthService.register({ userName, pinNumber, location, role });
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Register route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
// @ts-ignore - Express typings issue
router.post('/login', async (req, res) => {
  try {
    const { userName, pinNumber } = req.body;
    
    // Validate input
    if (!userName || !pinNumber) {
      console.log('❌ Login failed: Missing credentials');
      res.status(400).json({ 
        success: false, 
        message: 'Please provide userName and pinNumber' 
      });
      return;
    }
    
    const result = await AuthService.login({ userName, pinNumber });
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('❌ Login route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
// @ts-ignore - Express typings issue
router.get('/me', authenticateToken, (req, res) => {
  try {
    // User is attached to request by authenticateToken middleware
    const user = req.user;
    console.log(`📋 User profile requested for: ${user?.userName}`);
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('❌ Get user route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching user data' 
    });
  }
});

export default router; 