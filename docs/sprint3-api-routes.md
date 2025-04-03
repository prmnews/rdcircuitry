# Sprint 3: Backend API Routes

## Objectives
- Implement RESTful API endpoints with TypeScript
- Create typed authenticated routes
- Define API contracts with interfaces
- Implement proper error handling with type safety

## Tasks

### 1. Create API Types
Create `backend/src/types/api.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ILocation, IUser, UserRole } from './models';

// Auth types
export interface JwtPayload {
  id: string;
  userName: string;
  role: UserRole;
  location?: ILocation;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Response types
export interface ApiResponse {
  success: boolean;
  message?: string;
}

export interface AuthResponse extends ApiResponse {
  token?: string;
  user?: {
    id: string;
    userName: string;
    location: ILocation;
    role: UserRole;
    lastLogin?: Date;
  };
}

export interface TimerStateResponse extends ApiResponse {
  isExpired: boolean;
  isRDI: boolean;
  remainingTime?: number;
  targetTime: Date;
  now: Date;
  messageTimer?: {
    active: boolean;
    triggerTime?: Date;
    remainingTime?: number;
    isExpired?: boolean;
    processed?: boolean;
  };
}

export interface TimerResetResponse extends ApiResponse {
  newExpirationTime: Date;
  resetBy: string;
  resets: {
    last24Hours: number;
    total: number;
  };
}

export interface MessageTimerResponse extends ApiResponse {
  timer?: {
    triggerTime: Date;
    remainingTime: number;
    messageContent: {
      text: string;
      url?: string;
    };
  };
}

// WebSocket event types
export interface TimerResetEvent {
  resetBy: string;
  newExpirationTime: Date;
  resetTime: Date;
  reason?: string;
}

export interface TimerExpiredEvent {
  expiredAt: Date;
  messageData?: any;
}

export interface MessageTimerStartedEvent {
  triggerTime: Date;
  lagTimeMinutes: number;
}

export interface MessageTimerExpiredEvent {
  expiredAt: Date;
  messageData: {
    text: string;
    url?: string;
  };
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

### 2. Create Authentication Middleware
Create `backend/src/middleware/auth.ts`:

```typescript
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest, JwtPayload } from '../types/api';

// Auth middleware for protected routes
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if no token
    if (!token) {
      res.status(401).json({ message: 'No token, authorization denied' });
      return;
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload;
    
    // Add user to request
    req.user = decoded;
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Generate JWT token
export const generateToken = (user: {
  id: string;
  userName: string;
  role?: string;
  location?: any;
}): string => {
  return jwt.sign(
    { 
      id: user.id,
      userName: user.userName,
      role: user.role || 'user',
      location: user.location
    }, 
    process.env.JWT_SECRET || '',
    { expiresIn: '12h' }
  );
};
```

### 3. Create Auth Routes
Create `backend/src/routes/auth.ts`:

```typescript
import express, { Request, Response } from 'express';
import { User, Event } from '../models';
import { generateToken, protect } from '../middleware/auth';
import { AuthRequest, AuthResponse } from '../types/api';

const router = express.Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response<AuthResponse>) => {
  try {
    const { userName, pinNumber } = req.body;
    
    // Validate input
    if (!userName || !pinNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide username and PIN' 
      });
    }
    
    // Authenticate user
    const result = await User.authenticate(userName, pinNumber);
    
    if (!result.success) {
      return res.status(401).json({ 
        success: false,
        message: result.message 
      });
    }
    
    // Generate token
    const token = generateToken(result.user!);
    
    // Update last login
    await User.findOneAndUpdate(
      { userName },
      { $set: { lastLogin: new Date() } }
    );
    
    // Log login event
    await Event.create({
      userName,
      isUserValidation: true,
      eventType: 'LOGIN',
      location: result.user!.location || { countryCode: 'US', countryName: 'United States' },
      trueDateTime: new Date(),
      processed: true
    });
    
    // Send response
    res.json({
      success: true,
      token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get current user
router.get('/me', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { userName } = req.user!;
    
    // Find user by username
    const user = await User.findOne({ userName });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Return user info without sensitive fields
    res.json({
      success: true,
      user: {
        id: user._id,
        userName: user.userName,
        location: user.location,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default router;
```

### 4. Create Timer API Routes
Create `backend/src/routes/timer.ts`:

```typescript
import express, { Request, Response } from 'express';
import { State, Event, MessageTimer } from '../models';
import { protect } from '../middleware/auth';
import { emitTimerReset, emitTimerExpired } from '../websocket';
import { AuthRequest, TimerStateResponse, TimerResetResponse } from '../types/api';

const router = express.Router();

// Get current timer state
router.get('/check-expiry', async (_req: Request, res: Response<TimerStateResponse>) => {
  try {
    // Get current state
    const state = await State.findOne({ _id: 'timer_state' });
    
    if (!state) {
      return res.status(404).json({ 
        success: false,
        isExpired: false,
        isRDI: false,
        targetTime: new Date(),
        now: new Date(),
        message: 'No timer state found' 
      });
    }
    
    // Get current time and calculate time difference
    const now = new Date();
    const targetTime = new Date(state.currentState);
    const timeDiff = targetTime.getTime() - now.getTime();
    const isExpired = timeDiff <= 0;
    
    // Check if there's an active message timer
    let messageTimer = null;
    if (isExpired) {
      messageTimer = await MessageTimer.getActiveTimer();
    }
    
    // Return appropriate response
    if (isExpired) {
      if (messageTimer) {
        // Calculate remaining time for message timer
        const triggerTime = new Date(messageTimer.triggerTime);
        const messageTimeDiff = triggerTime.getTime() - now.getTime();
        const messageTimerExpired = messageTimeDiff <= 0;
        
        return res.json({
          success: true,
          isExpired: true,
          isRDI: state.isRDI,
          messageTimer: {
            active: messageTimer.active,
            triggerTime: messageTimer.triggerTime,
            remainingTime: Math.max(0, messageTimeDiff),
            isExpired: messageTimerExpired
          },
          targetTime,
          now
        });
      } else if (state.isRDI) {
        // Timer fully expired and processed
        return res.json({
          success: true,
          isExpired: true,
          isRDI: true,
          messageTimer: {
            active: false,
            processed: true
          },
          targetTime,
          now
        });
      } else {
        // Timer expired but no message timer yet
        return res.json({
          success: true,
          isExpired: true,
          isRDI: false,
          targetTime,
          now
        });
      }
    } else {
      // Timer not expired
      return res.json({
        success: true,
        isExpired: false,
        isRDI: state.isRDI,
        remainingTime: timeDiff,
        targetTime,
        now
      });
    }
  } catch (error) {
    console.error('Error checking timer expiry:', error);
    res.status(500).json({ 
      success: false,
      isExpired: false,
      isRDI: false,
      targetTime: new Date(),
      now: new Date(),
      message: 'Failed to check timer expiry'
    });
  }
});

// Reset timer
router.post('/reset', protect, async (req: AuthRequest, res: Response<TimerResetResponse>) => {
  try {
    // Get current user from middleware
    const { userName } = req.user!;
    const { reason } = req.body;
    
    // Get current state
    const state = await State.findOne({ _id: 'timer_state' });
    
    if (!state) {
      return res.status(404).json({ 
        success: false,
        message: 'Timer state not found',
        newExpirationTime: new Date(),
        resetBy: userName,
        resets: { last24Hours: 0, total: 0 }
      });
    }
    
    // Check if timer can be reset (not RDI)
    if (state.isRDI) {
      return res.status(400).json({ 
        success: false,
        message: 'Timer cannot be reset after expiration and message delivery',
        newExpirationTime: new Date(),
        resetBy: userName,
        resets: { last24Hours: 0, total: 0 }
      });
    }
    
    // Calculate new expiration time
    const now = new Date();
    const timerMinutes = parseInt(process.env.TIMER_INITIAL_MINUTES || '3', 10);
    const newExpirationTime = new Date(now.getTime() + timerMinutes * 60 * 1000);
    
    // Get recent reset counts
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentResets = await Event.countDocuments({
      eventType: 'TIMER_RESET',
      trueDateTime: { $gte: lastDay }
    });
    
    const totalResets = await Event.countDocuments({
      eventType: 'TIMER_RESET'
    });
    
    // Update state
    const updatedState = await State.findOneAndUpdate(
      { _id: 'timer_state' },
      {
        $set: {
          currentState: newExpirationTime,
          isRDI: false,
          updatedAt: now,
          'resetEvents.last24Hours': recentResets + 1,
          'resetEvents.total': totalResets + 1
        }
      },
      { new: true }
    );
    
    if (!updatedState) {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to update timer state',
        newExpirationTime,
        resetBy: userName,
        resets: { 
          last24Hours: recentResets + 1, 
          total: totalResets + 1 
        }
      });
    }
    
    // Log event
    await Event.logTimerReset({
      userName,
      location: req.user!.location || { countryCode: 'US', countryName: 'United States' },
      remainder: timerMinutes * 60,
      details: {
        reason,
        oldExpirationTime: state.currentState,
        newExpirationTime
      }
    });
    
    // Emit WebSocket event
    emitTimerReset({
      resetBy: userName,
      newExpirationTime,
      resetTime: now,
      reason
    });
    
    // Return success
    res.json({
      success: true,
      message: 'Timer reset successfully',
      newExpirationTime,
      resetBy: userName,
      resets: {
        last24Hours: recentResets + 1,
        total: totalResets + 1
      }
    });
  } catch (error) {
    console.error('Error resetting timer:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reset timer',
      newExpirationTime: new Date(),
      resetBy: req.user?.userName || 'unknown',
      resets: { last24Hours: 0, total: 0 }
    });
  }
});

export default router;
```

### 5. Create Message Timer Routes
Create `backend/src/routes/message.ts`:

```typescript
import express, { Request, Response } from 'express';
import { State, Event, MessageTimer } from '../models';
import { protect } from '../middleware/auth';
import { emitMessageTimerStarted, emitMessageTimerExpired } from '../websocket';
import { sendMessage } from '../services/message-service';
import { AuthRequest, MessageTimerResponse, MessageResult } from '../types/api';

const router = express.Router();

// Start message timer
router.post('/start', protect, async (req: AuthRequest, res: Response<MessageTimerResponse>) => {
  try {
    // Check if timer has expired
    const state = await State.findOne({ _id: 'timer_state' });
    
    if (!state) {
      return res.status(404).json({ 
        success: false,
        message: 'Timer state not found' 
      });
    }
    
    if (!State.isExpired(state)) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot start message timer when main timer is not expired' 
      });
    }
    
    if (state.isRDI) {
      return res.status(400).json({ 
        success: false,
        message: 'Message has already been sent' 
      });
    }
    
    // Check if there's already an active message timer
    const existingTimer = await MessageTimer.getActiveTimer();
    if (existingTimer) {
      const now = new Date();
      const triggerTime = new Date(existingTimer.triggerTime);
      const remainingMs = triggerTime.getTime() - now.getTime();
      
      return res.json({
        success: true,
        message: 'Message timer already active',
        timer: {
          triggerTime: existingTimer.triggerTime,
          remainingTime: Math.max(0, remainingMs),
          messageContent: existingTimer.messageContent
        }
      });
    }
    
    // Create new message timer
    const now = new Date();
    const lagTimeMinutes = parseFloat(process.env.LAG_TIME_MINUTES || '1');
    const lagTimeMs = lagTimeMinutes * 60 * 1000;
    const triggerTime = new Date(now.getTime() + lagTimeMs);
    
    const messageContent = {
      text: `Test message created at ${now.toISOString()}`,
      url: req.body.url || 'https://example.com'
    };
    
    // Create message timer
    const messageTimer = await MessageTimer.createTimer({
      triggerTime,
      messageContent
    });
    
    if (!messageTimer) {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to create message timer' 
      });
    }
    
    // Log event
    await Event.create({
      userName: req.user!.userName,
      isUserValidation: true,
      eventType: 'MESSAGE_SCHEDULED',
      location: req.user!.location || { countryCode: 'US', countryName: 'United States' },
      trueDateTime: now,
      processed: true,
      details: JSON.stringify({
        triggerTime,
        lagTimeMinutes
      })
    });
    
    // Emit event
    emitMessageTimerStarted({
      triggerTime: messageTimer.triggerTime,
      lagTimeMinutes
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
    console.error('Error starting message timer:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to start message timer' 
    });
  }
});

// Process message (for scheduled jobs)
router.post('/process', async (req: Request, res: Response) => {
  try {
    // Validate secret token to prevent unauthorized access
    const secretToken = req.header('x-cron-secret');
    if (secretToken !== process.env.CRON_SECRET) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }
    
    // Get active message timer
    const messageTimer = await MessageTimer.getActiveTimer();
    
    if (!messageTimer) {
      return res.json({
        success: true,
        message: 'No active message timer to process',
        processed: false
      });
    }
    
    // Check if timer has expired
    const now = new Date();
    const triggerTime = new Date(messageTimer.triggerTime);
    
    if (now < triggerTime) {
      return res.json({
        success: true,
        message: 'Message timer not yet expired',
        processed: false,
        remainingTime: triggerTime.getTime() - now.getTime()
      });
    }
    
    // Process message
    const messageResult: MessageResult = await sendMessage(messageTimer.messageContent);
    
    // Update state
    await State.updateOne(
      { _id: 'timer_state' },
      { $set: { isRDI: true, updatedAt: now } }
    );
    
    // Deactivate timer
    await MessageTimer.deactivateTimer();
    
    // Log event
    await Event.create({
      userName: 'system',
      isUserValidation: false,
      eventType: messageResult.success ? 'MESSAGE_SENT' : 'MESSAGE_FAILED',
      location: { countryCode: 'US', countryName: 'United States' },
      trueDateTime: now,
      processed: true,
      details: JSON.stringify(messageResult)
    });
    
    // Emit event
    emitMessageTimerExpired({
      expiredAt: now,
      messageData: messageTimer.messageContent
    });
    
    // Return response
    res.json({
      success: true,
      message: 'Message timer processed',
      result: messageResult
    });
  } catch (error) {
    console.error('Error processing message timer:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process message timer' 
    });
  }
});

export default router;
```

### 6. Create Message Service
Create `backend/src/services/message-service.ts`:

```typescript
import { IMessageContent } from '../types/models';
import { MessageResult } from '../types/api';

// Send message implementation
export const sendMessage = async (messageContent: IMessageContent): Promise<MessageResult> => {
  try {
    // This is a placeholder for actual message sending logic
    // In a real implementation, this might call Twitter API or other services
    console.log(`Sending message: ${messageContent.text}`);
    
    // Simulate successful message sending
    return {
      success: true,
      messageId: `msg_${Date.now()}`
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
```

### 7. Export WebSocket Event Emitters
Create `backend/src/websocket/index.ts`:

```typescript
import { Server } from 'socket.io';
import { 
  TimerResetEvent, 
  TimerExpiredEvent, 
  MessageTimerStartedEvent,
  MessageTimerExpiredEvent
} from '../types/api';

// Timer reset event
export const emitTimerReset = (data: TimerResetEvent): boolean => {
  const io: Server | undefined = global.socketIo;
  
  if (!io) {
    console.error('Cannot emit timer-reset: Socket.IO not initialized');
    return false;
  }
  
  try {
    io.emit('timer-reset', {
      resetBy: data.resetBy,
      newExpirationTime: data.newExpirationTime,
      resetTime: data.resetTime,
      reason: data.reason
    });
    console.log('Emitted timer-reset event');
    return true;
  } catch (error) {
    console.error('Error emitting timer-reset event:', error);
    return false;
  }
};

// Timer expired event
export const emitTimerExpired = (data: TimerExpiredEvent): boolean => {
  const io: Server | undefined = global.socketIo;
  
  if (!io) {
    console.error('Cannot emit timer-expired: Socket.IO not initialized');
    return false;
  }
  
  try {
    io.emit('timer-expired', {
      expiredAt: data.expiredAt,
      messageData: data.messageData
    });
    console.log('Emitted timer-expired event');
    return true;
  } catch (error) {
    console.error('Error emitting timer-expired event:', error);
    return false;
  }
};

// Message timer started event
export const emitMessageTimerStarted = (data: MessageTimerStartedEvent): boolean => {
  const io: Server | undefined = global.socketIo;
  
  if (!io) {
    console.error('Cannot emit message-timer-started: Socket.IO not initialized');
    return false;
  }
  
  try {
    io.emit('message-timer-started', {
      triggerTime: data.triggerTime,
      lagTimeMinutes: data.lagTimeMinutes
    });
    console.log('Emitted message-timer-started event');
    return true;
  } catch (error) {
    console.error('Error emitting message-timer-started event:', error);
    return false;
  }
};

// Message timer expired event
export const emitMessageTimerExpired = (data: MessageTimerExpiredEvent): boolean => {
  const io: Server | undefined = global.socketIo;
  
  if (!io) {
    console.error('Cannot emit message-timer-expired: Socket.IO not initialized');
    return false;
  }
  
  try {
    io.emit('message-timer-expired', {
      expiredAt: data.expiredAt,
      messageData: data.messageData
    });
    console.log('Emitted message-timer-expired event');
    return true;
  } catch (error) {
    console.error('Error emitting message-timer-expired event:', error);
    return false;
  }
};
```

### 8. Create WebSocket Handlers
Create `backend/src/websocket/handlers.ts`:

```typescript
import { Server, Socket } from 'socket.io';

const setupWebSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
    
    // Handle client subscribing to updates
    socket.on('subscribe', (data: { room: string }) => {
      socket.join(data.room);
      console.log(`Client ${socket.id} joined room: ${data.room}`);
    });
    
    // Handle client unsubscribing from updates
    socket.on('unsubscribe', (data: { room: string }) => {
      socket.leave(data.room);
      console.log(`Client ${socket.id} left room: ${data.room}`);
    });
  });
};

export default setupWebSocketHandlers;
```

### 9. Update Main Index File
Update `backend/src/index.ts` to include the routes:

```typescript
// Add these lines to your existing index.ts

// Import routes
import authRoutes from './routes/auth';
import timerRoutes from './routes/timer'; // TODO: Rename to messageTimer in future update
import messageRoutes from './routes/message';
import { protect } from './middleware/auth';
import { Request, Response } from 'express';
import { AuthRequest } from './types/api';

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/message', messageRoutes);

// Import and set up WebSocket handlers
import setupWebSocketHandlers from './websocket/handlers';
setupWebSocketHandlers(io);

// Protected test route
app.get('/api/protected', protect, (req: AuthRequest, res: Response) => {
  res.json({ 
    success: true,
    message: 'This is a protected route', 
    user: req.user 
  });
});
```

## Testing Strategy
1. Test authentication endpoints with valid/invalid credentials using TypeScript
2. Verify JWT token generation and validation with proper type checking
3. Test timer API endpoints with various states
4. Verify WebSocket events are emitted properly with typed data
5. Test message timer operations with TypeScript interfaces
6. Verify error handling for edge cases
7. Run TypeScript type checking to catch type-related errors

## Notes to the Future You

### TypeScript API Design Benefits
- Type definitions ensure consistent API contracts
- Interfaces define expected request and response structures
- Type checking catches errors at compile time instead of runtime
- IDE autocompletion makes development faster and safer
- Better documentation through type definitions

### WebSocket Integration with TypeScript
The WebSocket server is closely integrated with the API routes:
- API routes handle state changes with typed parameters
- WebSocket emits notifications using defined event interfaces
- Type checking ensures data consistency between API and WebSocket
- The state changes MUST occur before emitting WebSocket events
- This ensures database is the source of truth

### TypeScript Error Handling Strategy
We've implemented a consistent error handling approach:
- Try-catch blocks in all async route handlers with proper types
- Detailed error logging in catch blocks
- User-friendly error messages in typed responses
- Proper HTTP status codes for different errors
- Type checking for all error conditions

### TypeScript Authentication Flow
Authentication is handled through JWT tokens:
1. User logs in with username/PIN
2. Server generates JWT with 12-hour expiration
3. Client stores JWT and sends in x-auth-token header
4. Protected routes validate token and extract user info with proper typing
5. TypeScript ensures user properties are accessed correctly

Remember the JWT secret is stored in the .env file and must be kept secure. 