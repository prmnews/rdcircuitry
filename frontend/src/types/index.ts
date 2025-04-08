// User related types
export interface User {
  id: string;
  userName: string;
  role: 'admin' | 'user';
  location: {
    countryCode: string;
    countryName: string;
    timeZone: string;
    gmtOffset: string;
  };
  lastLogin?: string;
}

// Base response type with connection error handling
export interface BaseResponse {
  success: boolean;
  connectionError?: boolean;
  error?: string;
}

// User response
export interface UserResponse extends BaseResponse {
  user: User | null;
}

// Timer state types
export interface TimerState extends BaseResponse {
  isExpired: boolean;
  isRDI: boolean;
  remainingTime?: number;
  targetTime: string;
  now: string;
  location?: {
    countryCode: string;
    countryName: string;
    timeZone: string;
    gmtOffset: string;
  };
  messageTimer?: {
    active: boolean;
    triggerTime?: string;
    remainingTime?: number;
    isExpired?: boolean;
    processed?: boolean;
  };
  resetEvents?: ResetEvents;
}

// Reset events
export interface ResetEvents {
  last24Hours: number;
  total: number;
}

// Time history response
export interface TimeHistoryResponse extends BaseResponse {
  data: { hour: number; value: number }[];
}

// KPI statistics
export interface UserKpiStats {
  id: string;
  userName: string;
  minRemainder: number; // Minimum time (minutes) between 0 timer and reset
  avgRemainder: number; // Average time (minutes) between 0 timer and reset
  maxRemainder: number; // Maximum time (minutes) between 0 timer and reset
  totalResets: number;  // Total number of resets performed by the user
}

// KPI stats response
export interface UserStatsResponse extends BaseResponse {
  users: UserKpiStats[];
}

// WebSocket event types
export interface TimerResetEvent {
  resetBy: string;
  newExpirationTime: string;
  resetTime: string;
  reason?: string;
  remainder?: number;
}

export interface TimerExpiredEvent {
  expiredAt: string;
  messageData?: {
    text: string;
    url?: string;
  };
}

export interface MessageTimerStartedEvent {
  triggerTime: string;
  lagTimeMinutes: number;
}

export interface MessageTimerExpiredEvent {
  expiredAt: string;
  messageData: {
    text: string;
    url?: string;
  };
}

// Toast message type
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'; 