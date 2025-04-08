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

// Timer state types
export interface TimerState {
  success: boolean;
  isExpired: boolean;
  isRDI: boolean;
  remainingTime?: number;
  targetTime: string;
  now: string;
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

// KPI statistics
export interface UserKpiStats {
  id: string;
  userName: string;
  minRemainder: number; // Minimum time (minutes) between 0 timer and reset
  avgRemainder: number; // Average time (minutes) between 0 timer and reset
  maxRemainder: number; // Maximum time (minutes) between 0 timer and reset
  totalResets: number;  // Total number of resets performed by the user
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