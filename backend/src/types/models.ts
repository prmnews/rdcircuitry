import { Document, Model } from 'mongoose';
import { KeyType, KeyStatus, IAuditEntry } from '../models/apiKey';

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
  isUserValidation?: boolean;
  eventType: EventType;
  location: ILocation;
  trueDateTime: Date;
  localDateTime?: Date;
  remainder?: number | null;
  processed?: boolean;
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