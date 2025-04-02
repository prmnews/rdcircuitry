import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import { IUser, IUserModel, IUserResponse, UserRole } from '../types/models';

const UserSchema = new mongoose.Schema({
  userName: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  pinNumber: { 
    type: String, 
    required: true 
  },
  apiKey: { 
    type: String 
  },
  location: {
    countryCode: { 
      type: String, 
      required: true 
    },
    countryName: { 
      type: String, 
      required: true 
    },
    timeZone: { 
      type: String, 
      required: true 
    },
    gmtOffset: { 
      type: String, 
      required: true 
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'] as UserRole[],
    default: 'user'
  },
  lastLogin: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('pinNumber')) {
    return next();
  }
  
  try {
    console.log(`🔒 Hashing PIN for user: ${this.userName}`);
    const salt = await bcrypt.genSalt(10);
    this.pinNumber = await bcrypt.hash(this.pinNumber, salt);
    next();
  } catch (error) {
    console.error(`❌ Error hashing PIN for user ${this.userName}:`, error);
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePin = async function(candidatePin: string): Promise<boolean> {
  console.log(`🔐 Verifying PIN for user: ${this.userName}`);
  const result = await bcrypt.compare(candidatePin, this.pinNumber);
  console.log(`🔑 PIN verification ${result ? 'successful' : 'failed'} for ${this.userName}`);
  return result;
};

// Static method to authenticate user
UserSchema.statics.authenticate = async function(userName: string, pinNumber: string): Promise<IUserResponse> {
  console.log(`🔍 Authenticating user: ${userName}`);
  
  const user = await this.findOne({ userName });
  
  if (!user) {
    console.log(`❌ Authentication failed: User "${userName}" not found`);
    return { success: false, message: 'User not found' };
  }
  
  const isMatch = await user.comparePin(pinNumber);
  
  if (!isMatch) {
    console.log(`❌ Authentication failed: Invalid PIN for user "${userName}"`);
    return { success: false, message: 'Invalid PIN' };
  }
  
  // Update last login time
  user.lastLogin = new Date();
  await user.save();
  
  console.log(`✅ Authentication successful for user: ${userName}`);
  
  return { 
    success: true, 
    user: {
      id: user._id,
      userName: user.userName,
      location: user.location,
      role: user.role
    } 
  };
};

const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User; 