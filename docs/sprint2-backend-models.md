# Sprint 2: Backend Database Models

## Objectives
- Create MongoDB models with TypeScript for the backend
- Implement core data structures with proper typing
- Define model relationships with TypeScript interfaces
- Set up schema validation

## Tasks

### 1. Create Type Definitions
Create `backend/src/types/models.ts`:

```typescript
import { Document, Model } from 'mongoose';

// State model types
export interface IResetEvents {
  last24Hours: number;
  total: number;
}

export interface IState extends Document {
  _id: string;
  currentState: Date;
  isRDI: boolean;
  resetEvents: IResetEvents;
  updatedAt: Date;
  createdAt: Date;
}

export interface IStateModel extends Model<IState> {
  getCurrentState(): Promise<IState | null>;
  isExpired(state: IState | null): boolean;
}

// Event model types
export type EventType = 
  | 'LOGIN'
  | 'TIMER_RESET'
  | 'TIMER_EXPIRED'
  | 'MESSAGE_SCHEDULED'
  | 'MESSAGE_SENDING'
  | 'MESSAGE_SENT'
  | 'MESSAGE_FAILED';

export interface ILocation {
  countryCode: string;
  countryName: string;
  timeZone?: string;
  gmtOffset?: string;
}

export interface IEventData {
  userName: string;
  location: ILocation;
  remainder?: number | null;
  details?: any;
}

export interface IEvent extends Document {
  userName: string;
  isUserValidation: boolean;
  eventType: EventType;
  location: ILocation;
  trueDateTime: Date;
  remainder: number | null;
  processed: boolean;
  details: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventModel extends Model<IEvent> {
  getRecentResets(hours?: number): Promise<number>;
  logTimerReset(data: IEventData): Promise<IEvent>;
}

// Message Timer model types
export interface IMessageContent {
  text: string;
  url?: string;
}

export interface IMessageTimerData {
  triggerTime: Date;
  messageContent: IMessageContent;
}

export interface IMessageTimer extends Document {
  _id: string;
  triggerTime: Date;
  active: boolean;
  messageContent: IMessageContent;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageTimerModel extends Model<IMessageTimer> {
  getActiveTimer(): Promise<IMessageTimer | null>;
  deactivateTimer(): Promise<any>;
  createTimer(data: IMessageTimerData): Promise<IMessageTimer | null>;
}

// User model types
export type UserRole = 'user' | 'admin';

export interface IUserLocation {
  countryCode: string;
  countryName: string;
  timeZone: string;
  gmtOffset: string;
}

export interface IUserResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    userName: string;
    location: IUserLocation;
    role: UserRole;
  };
}

export interface IUser extends Document {
  userName: string;
  pinNumber: string;
  apiKey?: string;
  location: IUserLocation;
  role: UserRole;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePin(candidatePin: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser> {
  authenticate(userName: string, pinNumber: string): Promise<IUserResponse>;
}

// Country model types
export interface ITimeZoneMetadata {
  timeZone: string;
  gmtOffset: string;
}

export interface ICountry extends Document {
  countryCode: string;
  countryName: string;
  metadata: ITimeZoneMetadata[];
}

// ApiKey model types
export interface IApiKey extends Document {
  apiKey: string;
  userName: string;
  apiStart: Date;
  apiExpireDateTime: Date;
  isRevoked: boolean;
  lastUsed?: Date;
  usageCount: number;
  description?: string;
  
  // Key rotation fields
  previousKey?: string;
  keyRotationDate?: Date;
  keyRotationReason?: string;
  
  // Audit trail
  createdBy: string;
  lastModifiedBy?: string;
  modificationHistory: IAuditEntry[];
  
  // Key metadata
  keyType: KeyType;
  allowedIPs?: string[];
  allowedOrigins?: string[];
  
  // Key lifecycle
  status: KeyStatus;
  suspensionReason?: string;
  suspensionDate?: Date;
  
  // Helper methods
  isExpired(): boolean;
  isValid(): boolean;
  incrementUsage(): Promise<void>;
  validateUser(): Promise<boolean>;
  rotate(newKey: string, reason: string, performedBy: string): Promise<void>;
  suspend(reason: string, performedBy: string): Promise<void>;
  revoke(reason: string, performedBy: string): Promise<void>;
  reactivate(performedBy: string): Promise<void>;
  addAuditEntry(action: string, performedBy: string, details?: string): Promise<void>;
}

export interface IApiKeyModel extends Model<IApiKey> {}
```

### 2. Create State Model
Create `backend/src/models/state.ts`:

```typescript
import mongoose from 'mongoose';
import { IState, IStateModel } from '../types/models';

const StateSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: 'timer_state',
    required: true 
  },
  currentState: { 
    type: Date, 
    required: true 
  },
  isRDI: { 
    type: Boolean, 
    default: false 
  },
  resetEvents: {
    last24Hours: { 
      type: Number, 
      default: 0 
    },
    total: { 
      type: Number, 
      default: 0 
    }
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Add static methods
StateSchema.statics.getCurrentState = async function(): Promise<IState | null> {
  const state = await this.findOne({ _id: 'timer_state' });
  if (!state) {
    return null;
  }
  return state;
};

StateSchema.statics.isExpired = function(state: IState | null): boolean {
  if (!state || !state.currentState) {
    return false;
  }
  
  const now = new Date();
  const targetTime = new Date(state.currentState);
  return now >= targetTime;
};

const State = mongoose.model<IState, IStateModel>('State', StateSchema);

export default State;
```

### 3. Create Event Model
Create `backend/src/models/event.ts`:

```typescript
import mongoose from 'mongoose';
import { IEvent, IEventModel, IEventData, EventType } from '../types/models';

const EventSchema = new mongoose.Schema({
  userName: { 
    type: String, 
    required: true,
    index: true
  },
  isUserValidation: { 
    type: Boolean, 
    default: false 
  },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'LOGIN', 
      'TIMER_RESET', 
      'TIMER_EXPIRED', 
      'MESSAGE_SCHEDULED',
      'MESSAGE_SENDING',
      'MESSAGE_SENT',
      'MESSAGE_FAILED'
    ] as EventType[],
    index: true
  },
  location: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  trueDateTime: { 
    type: Date, 
    required: true,
    index: true
  },
  remainder: { 
    type: Number,
    default: null
  },
  processed: { 
    type: Boolean, 
    default: false,
    index: true
  },
  details: { 
    type: String 
  }
}, { 
  timestamps: true 
});

// Static methods
EventSchema.statics.getRecentResets = async function(hours: number = 24): Promise<number> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  
  return this.countDocuments({
    eventType: 'TIMER_RESET',
    trueDateTime: { $gte: cutoff }
  });
};

EventSchema.statics.logTimerReset = async function(data: IEventData): Promise<IEvent> {
  return this.create({
    userName: data.userName || 'system',
    isUserValidation: true,
    eventType: 'TIMER_RESET',
    location: data.location || { countryCode: 'US', countryName: 'United States' },
    trueDateTime: new Date(),
    remainder: data.remainder || null,
    processed: true,
    details: data.details ? JSON.stringify(data.details) : null
  });
};

const Event = mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event;
```

### 4. Create Message Timer Model
Create `backend/src/models/message-timer.ts`:

```typescript
import mongoose from 'mongoose';
import { IMessageTimer, IMessageTimerModel, IMessageTimerData } from '../types/models';

const MessageTimerSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: 'message_timer',
    required: true
  },
  triggerTime: { 
    type: Date, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  messageContent: {
    text: { 
      type: String, 
      required: true 
    },
    url: { 
      type: String 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Add static methods
MessageTimerSchema.statics.getActiveTimer = async function(): Promise<IMessageTimer | null> {
  return this.findOne({ 
    _id: 'message_timer', 
    active: true 
  });
};

MessageTimerSchema.statics.deactivateTimer = async function(): Promise<any> {
  return this.updateOne(
    { _id: 'message_timer' },
    { $set: { active: false, updatedAt: new Date() } }
  );
};

MessageTimerSchema.statics.createTimer = async function(data: IMessageTimerData): Promise<IMessageTimer | null> {
  return this.findOneAndUpdate(
    { _id: 'message_timer' },
    { 
      $set: {
        triggerTime: data.triggerTime,
        active: true,
        messageContent: data.messageContent,
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
};

const MessageTimer = mongoose.model<IMessageTimer, IMessageTimerModel>('MessageTimer', MessageTimerSchema);

export default MessageTimer;
```

### 5. Create User Model
Create `backend/src/models/user.ts`:

```typescript
import mongoose from 'mongoose';
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
    const salt = await bcrypt.genSalt(10);
    this.pinNumber = await bcrypt.hash(this.pinNumber, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePin = async function(candidatePin: string): Promise<boolean> {
  return bcrypt.compare(candidatePin, this.pinNumber);
};

// Static method to authenticate user
UserSchema.statics.authenticate = async function(userName: string, pinNumber: string): Promise<IUserResponse> {
  const user = await this.findOne({ userName });
  
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  const isMatch = await user.comparePin(pinNumber);
  
  if (!isMatch) {
    return { success: false, message: 'Invalid PIN' };
  }
  
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
```

### 6. Create Country/TimeZone Model
Create `backend/src/models/country.ts`:

```typescript
import mongoose from 'mongoose';
import { ICountry } from '../types/models';

const CountrySchema = new mongoose.Schema({
  countryCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  countryName: { 
    type: String, 
    required: true 
  },
  metadata: [{
    timeZone: { 
      type: String, 
      required: true 
    },
    gmtOffset: { 
      type: String, 
      required: true 
    }
  }]
});

const Country = mongoose.model<ICountry>('Country', CountrySchema);

export default Country;
```

### 7. Create Models Index File
Create `backend/src/models/index.ts` to export all models:

```typescript
import State from './state';
import Event from './event';
import MessageTimer from './message-timer';
import User from './user';
import Country from './country';
import ApiKey from './apiKey';

export {
  State,
  Event,
  MessageTimer,
  User,
  Country,
  ApiKey
};
```

### 8. Create API Key Model
Create `backend/src/models/apiKey.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

// Key types enum
export enum KeyType {
  READ_ONLY = 'read-only',
  ADMIN = 'admin',
  SERVICE = 'service'
}

// Key status enum
export enum KeyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

// Audit trail interface
export interface IAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details?: string;
}

// API Key document interface
export interface IApiKey extends Document {
  apiKey: string;
  userName: string;  // Reference to User.userName
  apiStart: Date;
  apiExpireDateTime: Date;
  isRevoked: boolean;
  lastUsed?: Date;
  usageCount: number;
  description?: string;
  
  // Key rotation fields
  previousKey?: string;
  keyRotationDate?: Date;
  keyRotationReason?: string;
  
  // Audit trail
  createdBy: string;
  lastModifiedBy?: string;
  modificationHistory: IAuditEntry[];
  
  // Key metadata
  keyType: KeyType;
  allowedIPs?: string[];
  allowedOrigins?: string[];
  
  // Key lifecycle
  status: KeyStatus;
  suspensionReason?: string;
  suspensionDate?: Date;
  
  // Helper methods
  isExpired(): boolean;
  isValid(): boolean;
  incrementUsage(): Promise<void>;
  validateUser(): Promise<boolean>;
  rotate(newKey: string, reason: string, performedBy: string): Promise<void>;
  suspend(reason: string, performedBy: string): Promise<void>;
  revoke(reason: string, performedBy: string): Promise<void>;
  reactivate(performedBy: string): Promise<void>;
  addAuditEntry(action: string, performedBy: string, details?: string): Promise<void>;
}

// Create ApiKey schema
const ApiKeySchema = new Schema<IApiKey>({
  apiKey: {
    type: String,
    required: true,
    index: { unique: true }
  },
  userName: {
    type: String,
    required: true,
    index: true,
    ref: 'User',
    validate: {
      validator: async function(userName: string) {
        const User = mongoose.model('User');
        const user = await User.findOne({ userName });
        return user !== null;
      },
      message: 'User does not exist'
    }
  },
  apiStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  apiExpireDateTime: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    required: true,
    default: false
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String
  },
  
  // Key rotation fields
  previousKey: {
    type: String
  },
  keyRotationDate: {
    type: Date
  },
  keyRotationReason: {
    type: String
  },
  
  // Audit trail
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String
  },
  modificationHistory: [{
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    details: String
  }],
  
  // Key metadata
  keyType: {
    type: String,
    enum: Object.values(KeyType),
    required: true,
    default: KeyType.READ_ONLY
  },
  allowedIPs: [{
    type: String
  }],
  allowedOrigins: [{
    type: String
  }],
  
  // Key lifecycle
  status: {
    type: String,
    enum: Object.values(KeyStatus),
    required: true,
    default: KeyStatus.ACTIVE
  },
  suspensionReason: {
    type: String
  },
  suspensionDate: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'apiKeys'
});

// Indexes for efficient queries
ApiKeySchema.index({ userName: 1, isRevoked: 1 });
ApiKeySchema.index({ apiExpireDateTime: 1 });
ApiKeySchema.index({ status: 1 });
ApiKeySchema.index({ keyType: 1 });

// Helper method to check if key is expired
ApiKeySchema.methods.isExpired = function(): boolean {
  return this.apiExpireDateTime < new Date();
};

// Helper method to check if key is valid
ApiKeySchema.methods.isValid = function(): boolean {
  return !this.isRevoked && !this.isExpired() && this.status === KeyStatus.ACTIVE;
};

// Helper method to increment usage
ApiKeySchema.methods.incrementUsage = async function(): Promise<void> {
  this.lastUsed = new Date();
  this.usageCount += 1;
  await this.save();
};

// Helper method to validate user exists
ApiKeySchema.methods.validateUser = async function(): Promise<boolean> {
  const User = mongoose.model('User');
  const user = await User.findOne({ userName: this.userName });
  return user !== null;
};

// Helper method to rotate key
ApiKeySchema.methods.rotate = async function(newKey: string, reason: string, performedBy: string): Promise<void> {
  this.previousKey = this.apiKey;
  this.apiKey = newKey;
  this.keyRotationDate = new Date();
  this.keyRotationReason = reason;
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_ROTATION', performedBy, reason);
  await this.save();
};

// Helper method to suspend key
ApiKeySchema.methods.suspend = async function(reason: string, performedBy: string): Promise<void> {
  this.status = KeyStatus.SUSPENDED;
  this.suspensionReason = reason;
  this.suspensionDate = new Date();
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_SUSPENSION', performedBy, reason);
  await this.save();
};

// Helper method to revoke key
ApiKeySchema.methods.revoke = async function(reason: string, performedBy: string): Promise<void> {
  this.status = KeyStatus.REVOKED;
  this.isRevoked = true;
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_REVOCATION', performedBy, reason);
  await this.save();
};

// Helper method to reactivate key
ApiKeySchema.methods.reactivate = async function(performedBy: string): Promise<void> {
  this.status = KeyStatus.ACTIVE;
  this.suspensionReason = undefined;
  this.suspensionDate = undefined;
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_REACTIVATION', performedBy);
  await this.save();
};

// Helper method to add audit entry
ApiKeySchema.methods.addAuditEntry = async function(action: string, performedBy: string, details?: string): Promise<void> {
  this.modificationHistory.push({
    timestamp: new Date(),
    action,
    performedBy,
    details
  });
};

// Create and export the model
const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;
```

## Testing Strategy
1. Verify model schemas match specifications with TypeScript interfaces
2. Test model static methods with proper typing
3. Verify relationships between models using TypeScript type checking
4. Test schema validation rules
5. Verify TypeScript compilation works correctly for all models

## Notes to the Future You

### TypeScript Schema Design Principles
- Use TypeScript interfaces to define document and model structure
- Extend Mongoose's Document and Model interfaces for proper typing
- Define enums and custom types for better type safety
- Use generics to provide proper typing for static methods
- Separate types into their own files for better organization

### Knowledge Extraction
When extracting models from the old codebase:
- Convert JavaScript schemas to TypeScript schemas
- Create proper interfaces for documents and models
- Add type definitions for all static and instance methods
- Add type definitions for all input and output data
- Use TypeScript features to enforce data integrity

### Connection with Frontend
Remember that the frontend will only interact with these models via the API. The models handle:
1. Data structure and validation with TypeScript interfaces
2. Business logic related to data with typed methods
3. Database operations with proper return types

The frontend knows nothing about these implementation details, only the data returned by the API.

### TypeScript Data Integrity Benefits
- TypeScript interfaces provide compile-time validation
- Type checking ensures method parameters match expected types
- Mongoose validation provides runtime validation
- Improved IDE support with autocompletion for schema properties
- Better documentation through interfaces and types

## Note on Deprecated Models

The `timer.ts` model appears to be an older implementation that has been replaced by the `message-timer.ts` model. The `timer.ts` model is still referenced in some parts of the codebase (specifically in `backend/src/types/index.ts`), but it should be deprecated in favor of using `message-timer.ts`.

We should:
1. Remove references to the `timer.ts` model in `types/index.ts`
2. Replace uses of the TimerState enum with appropriate values or a new enum
3. Eventually remove the `timer.ts` file entirely once all references are updated

The `message-timer.ts` provides a more focused implementation for scheduling and managing timed messages, which aligns better with the current application architecture.

The frontend knows nothing about these implementation details, only the data returned by the API.

## Deprecation Plan for Timer Model

The `timer.ts` model is a legacy implementation that is now replaced by the `message-timer.ts` model. The following steps should be taken to properly deprecate and eventually remove it:

1. **Current Status:**
   - The Timer model is not directly imported anywhere in the active codebase
   - The TimerState enum has been moved to `backend/src/types/index.ts`
   - The model has been tagged with `@deprecated` JSDoc comment

2. **Immediate Actions:**
   - ✅ Move the TimerState enum to types/index.ts (Completed)
   - ✅ Add deprecation notice to the timer.ts file (Completed)
   - ✅ Update sprint documentation to note the deprecation

3. **Future Removal Plan:**
   - Remove any remaining references in the code to the timer.ts file
   - Update the timerRoutes in sprint3 to be renamed to messageTimerRoutes
   - Once all references are updated, delete the timer.ts file
   - Remove any timer-related exports from models/index.ts

4. **Verification Before Deletion:**
   - Confirm all functionality previously provided by timer.ts is now handled by message-timer.ts
   - Run all tests to ensure no regression
   - Verify no runtime errors after removing references

This modernization will help streamline the codebase and remove duplicate functionality. 