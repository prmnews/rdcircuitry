import jwt from 'jsonwebtoken';
import User from '../models/user';
import { ApiKey } from '../models';
import { IUser, IUserLocation, UserRole } from '../types/models';
import { SECURITY_CONFIG } from '../config';
import bcrypt from 'bcryptjs';

interface RegisterInput {
  userName: string;
  pinNumber: string;
  location: IUserLocation;
  role?: UserRole;
}

interface LoginInput {
  userName: string;
  pinNumber: string;
}

interface ApiKeyAuthInput {
  apiKey: string;
}

interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: Partial<IUser>;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<AuthResult> {
    try {
      console.log(`🔍 Checking if user "${input.userName}" already exists`);
      // Check if user already exists
      const existingUser = await User.findOne({ userName: input.userName });
      if (existingUser) {
        console.log(`❌ Registration failed: Username "${input.userName}" already in use`);
        return { success: false, message: 'Username already in use' };
      }

      console.log(`👤 Creating new user: ${input.userName}`);
      console.log(`🌍 Location: ${input.location.countryName} (${input.location.countryCode})`);
      
      // Create new user
      const user = new User({
        userName: input.userName,
        pinNumber: input.pinNumber,
        location: input.location,
        role: input.role || 'user',
      });

      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      // Return success response with user data (excluding pin)
      const userResponse = {
        _id: user._id,
        userName: user.userName,
        location: user.location,
        role: user.role,
      };

      console.log(`✅ User "${input.userName}" registered successfully`);
      return {
        success: true,
        message: 'User registered successfully',
        token,
        user: userResponse,
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Login existing user
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    try {
      console.log(`🔑 Processing login for user: ${input.userName}`);
      
      // Use the static authenticate method from the User model
      const authResult = await User.authenticate(input.userName, input.pinNumber);
      
      if (!authResult.success || !authResult.user) {
        return { success: false, message: authResult.message || 'Login failed' };
      }

      // Generate JWT token for user
      const user = await User.findOne({ userName: input.userName });
      if (!user) {
        console.log(`❌ Login error: User found in authentication but not when fetching details`);
        return { success: false, message: 'Login failed' };
      }
      
      const token = this.generateToken(user);

      console.log(`✅ Login successful for user: ${input.userName}`);
      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          userName: user.userName,
          location: user.location,
          role: user.role,
        }
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  /**
   * Authenticate with API key
   */
  static async authenticateWithApiKey(input: ApiKeyAuthInput): Promise<AuthResult> {
    try {
      console.log(`🔑 Processing API Key authentication`);
      
      // Find all active API keys
      const apiKeys = await ApiKey.find({ 
        status: 'active',
        isRevoked: false
      });
      
      if (!apiKeys || apiKeys.length === 0) {
        console.log(`❌ API Key authentication error: No active API keys found`);
        return { success: false, message: 'Authentication failed' };
      }
      
      // Check each API key
      let matchedKey = null;
      for (const key of apiKeys) {
        // Check if key is expired
        if (key.isExpired()) {
          console.log(`⌛ Skipping expired API key for user: ${key.userName}`);
          continue;
        }
        
        // Compare the raw API key with the hashed one
        const isMatch = await bcrypt.compare(input.apiKey, key.apiKey);
        if (isMatch) {
          matchedKey = key;
          break;
        }
      }
      
      if (!matchedKey) {
        console.log(`❌ API Key authentication error: Invalid API key`);
        return { success: false, message: 'Invalid API key' };
      }
      
      // Update key usage stats
      matchedKey.lastUsed = new Date();
      matchedKey.usageCount += 1;
      await matchedKey.save();
      
      // Get the user associated with this API key
      const user = await User.findOne({ userName: matchedKey.userName });
      if (!user) {
        console.log(`❌ API Key authentication error: User not found for API key`);
        return { success: false, message: 'User not found for API key' };
      }
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      console.log(`✅ API Key authentication successful for user: ${user.userName}`);
      return {
        success: true,
        message: 'Authentication successful',
        token,
        user: {
          _id: user._id,
          userName: user.userName,
          location: user.location,
          role: user.role,
        }
      };
    } catch (error) {
      console.error('❌ API Key authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Generate JWT token for authenticated user
   */
  private static generateToken(user: IUser): string {
    const secret = SECURITY_CONFIG.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    console.log(`🔐 Generating JWT token for user: ${user.userName}`);
    return jwt.sign(
      {
        _id: user._id,
        userName: user.userName,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Get complete user data by ID
   */
  static async getCurrentUser(userId: string): Promise<IUser | null> {
    try {
      console.log(`🔍 Fetching user data for ID: ${userId}`);
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      return null;
    }
  }
} 