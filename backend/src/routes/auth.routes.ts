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
 * @route POST /api/auth/api-key
 * @desc Authenticate using API key
 * @access Public
 */
// @ts-ignore - Express typings issue
router.post('/api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Validate input
    if (!apiKey) {
      console.log('❌ API key authentication failed: Missing API key');
      res.status(400).json({ 
        success: false, 
        message: 'Please provide an API key' 
      });
      return;
    }
    
    const result = await AuthService.authenticateWithApiKey({ apiKey });
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('❌ API key authentication route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during API key authentication' 
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
// @ts-ignore - Express typings issue
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User basic info is attached to request by authenticateToken middleware
    const userId = req.user?._id;
    console.log(`📋 User profile requested for ID: ${userId}`);
    
    if (!userId) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Fetch complete user data from database
    const user = await AuthService.getCurrentUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Return full user object
    res.status(200).json({ 
      success: true, 
      user: {
        id: user._id,
        userName: user.userName,
        role: user.role,
        location: user.location,
        lastLogin: user.lastLogin
      } 
    });
  } catch (error) {
    console.error('❌ Get user route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching user data' 
    });
  }
});

export default router; 