import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SECURITY_CONFIG } from '../config';

// Extending Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        userName: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    console.log('🔒 Authentication failed: No token provided');
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const secret = SECURITY_CONFIG.JWT_SECRET;
    if (!secret) {
      console.error('🔑 Authentication error: JWT_SECRET not defined');
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    const decoded = jwt.verify(token, secret);
    req.user = decoded as { _id: string; userName: string; role: string };
    console.log(`🔓 Authenticated user: ${req.user.userName}`);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('🕒 Authentication failed: Token expired');
      return res.status(401).json({ message: 'Token expired' });
    }
    console.log('🚫 Authentication failed: Invalid token');
    return res.status(403).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    console.log(`👑 Admin access granted for user: ${req.user.userName}`);
    next();
  } else {
    console.log(`⛔ Admin access denied for user: ${req.user?.userName || 'unknown'}`);
    res.status(403).json({ message: 'Admin access required' });
  }
}; 