// Replace the import with local enum definition
// import { TimerState } from '../models/timer';

// Timer states enum (replacing dependency on deprecated timer.ts)
export enum TimerState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  EXPIRED = 'expired'
}

// API Response type
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// WebSocket Event types
export interface SocketAuthData {
  userId: string;
  isAdmin?: boolean;
}

export interface TimerStartData {
  minutes: number;
  name?: string;
}

export interface TimerUpdateData {
  timerId: string;
  remainingSeconds: number;
  state: TimerState;
}

// User types
export interface UserPublicData {
  _id: string;
  name: string;
  email: string;
  role: string;
}

// Environment variable types
export interface EnvVariables {
  NODE_ENV: string;
  PORT: string;
  MONGODB_URI: string;
  MONGODB_DB: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
  WEBSOCKET_PORT: string;
  TIMER_INITIAL_MINUTES: string;
  MESSAGE_ENABLE: string;
  MESSAGE_YELLOW_MINUTES: string;
  MESSAGE_RED_MINUTES: string;
  LAG_TIME_MINUTES: string;
  MESSAGE_WEBHOOK_SECRET: string;
} 