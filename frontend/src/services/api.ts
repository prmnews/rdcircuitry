import { 
  TimerState, 
  User, 
  UserKpiStats, 
  UserResponse, 
  TimeHistoryResponse, 
  UserStatsResponse,
  BaseResponse 
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Get auth token from local storage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Configurable retry options
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  backoffFactor: 2,   // Exponential backoff
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Creates a default fallback response based on the endpoint
 * @param endpoint The API endpoint
 * @param connectionError Whether this is a connection error
 * @returns A typed fallback response
 */
function createFallbackResponse<T>(endpoint: string, connectionError = true): T {
  // For authentication endpoint
  if (endpoint === '/auth/me') {
    return { 
      success: false, 
      user: null, 
      connectionError 
    } as unknown as T;
  } 
  // For timer state endpoint
  else if (endpoint === '/timer/check-expiry') {
    return { 
      success: false,
      connectionError
    } as unknown as T;
  }
  // For history data endpoint 
  else if (endpoint === '/timer/history') {
    return { 
      success: false, 
      data: [], 
      connectionError
    } as unknown as T;
  }
  // For user stats endpoint
  else if (endpoint === '/users/kpi-stats') {
    return { 
      success: false, 
      users: [], 
      connectionError
    } as unknown as T;
  }
  
  // Default fallback for other endpoints
  return { 
    success: false, 
    connectionError,
    error: connectionError 
      ? 'Unable to connect to server. Please check your network connection.' 
      : 'An unknown error occurred'
  } as unknown as T;
}

/**
 * Fetch wrapper with auth, error handling and retries that never throws errors
 */
async function fetchWithAuth<T>(
  endpoint: string, 
  options: RequestInit = {},
  retryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  // We'll use this flag to track network connectivity issues
  let isConnectionError = false;
  
  // Try up to maxRetries + 1 times (initial attempt + retries)
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      // If this is a retry, add a delay with exponential backoff
      if (attempt > 0) {
        const delay = retryOptions.initialDelay * Math.pow(retryOptions.backoffFactor, attempt - 1);
        console.log(`🔄 Retry ${attempt}/${retryOptions.maxRetries} for ${endpoint} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Prepare request
      const token = getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      const requestOptions = {
        ...options,
        headers: token ? { 
          ...headers, 
          'Authorization': `Bearer ${token}`
        } : headers,
      };
      
      const apiUrl = `${API_BASE_URL}${endpoint}`;
      if (attempt === 0) console.log(`🔄 API Request: ${apiUrl}`);
      
      // Execute fetch - catch any network errors
      let response;
      try {
        response = await fetch(apiUrl, requestOptions);
      } catch (fetchError) {
        console.error(`❌ Network error for ${endpoint}:`, fetchError);
        isConnectionError = true;
        
        // If we have retries left, continue to the next attempt
        if (attempt < retryOptions.maxRetries) {
          continue;
        }
        
        // If we've exhausted retries, return appropriate fallback
        return createFallbackResponse<T>(endpoint, true);
      }
      
      // Check for error status codes
      if (!response.ok) {
        // If status is retryable and we have retries left
        if (retryOptions.retryableStatuses.includes(response.status) && attempt < retryOptions.maxRetries) {
          console.log(`🔄 Retryable status ${response.status} for ${endpoint}`);
          continue;
        }

        // Try to parse error response
        let errorData = {};
        try {
          errorData = await response.json();
        } catch {
          // Silent catch - if we can't parse JSON, we'll just use empty object
        }
        
        console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorData);
        
        // Return a fallback response for non-retryable or exhausted errors
        return {
          success: false,
          status: response.status,
          error: (errorData as any)?.message || `API error: ${response.status} ${response.statusText}`
        } as unknown as T;
      }
      
      // Try to parse success response
      try {
        return await response.json();
      } catch (jsonError) {
        console.error(`❌ JSON parsing error for ${endpoint}:`, jsonError);
        
        // Return a fallback for JSON parsing errors
        return {
          success: false,
          error: 'Failed to parse response from server'
        } as unknown as T;
      }
    } catch (unexpectedError) {
      // This should never happen as we catch errors at each step,
      // but just in case there's some unforeseen error path
      console.error(`❌ Unexpected error for ${endpoint}:`, unexpectedError);
      
      // If we have retries left, continue to the next attempt
      if (attempt < retryOptions.maxRetries) {
        continue;
      }
      
      // Return a fallback if we've exhausted retries
      return createFallbackResponse<T>(endpoint, isConnectionError);
    }
  }

  // This is a fallback for if we somehow exit the loop without returning
  // (should never happen, but TypeScript requires a return)
  return createFallbackResponse<T>(endpoint, isConnectionError);
}

// Auth API calls
export const authApi = {
  login: async (userName: string, pinNumber: string) => {
    const data = await fetchWithAuth<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userName, pinNumber }),
    });
    
    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    return data;
  },
  
  getCurrentUser: async () => {
    return fetchWithAuth<UserResponse>('/auth/me');
  },
  
  logout: () => {
    localStorage.removeItem('token');
  },
};

// Timer API calls
export const timerApi = {
  getTimerState: async () => {
    return fetchWithAuth<TimerState>('/timer/check-expiry');
  },
  
  resetTimer: async (reason?: string) => {
    return fetchWithAuth<{ 
      success: boolean; 
      connectionError?: boolean;
      newExpirationTime: string;
      resetBy: string;
      resets: { last24Hours: number; total: number }
    }>('/timer/reset', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Manual reset from dashboard' }),
    });
  },
  
  getTimeRemainingHistory: async () => {
    return fetchWithAuth<TimeHistoryResponse>('/timer/history');
  },
};

// Message API calls
export const messageApi = {
  startMessageTimer: async (url?: string) => {
    return fetchWithAuth<{ 
      success: boolean;
      connectionError?: boolean;
      message?: string;
      timer?: {
        triggerTime: string;
        remainingTime: number;
        messageContent: { text: string; url?: string }
      }
    }>('/message/start', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
  
  getMessageStatus: async () => {
    return fetchWithAuth<{
      success: boolean;
      connectionError?: boolean;
      timerActive: boolean;
      message: string;
      timer?: {
        triggerTime: string;
        remainingTime: number;
        formattedRemaining: string;
        messageContent: { text: string; url?: string }
      }
    }>('/message/status');
  },
};

// User KPI statistics
export const userApi = {
  getUserKpiStats: async () => {
    return fetchWithAuth<UserStatsResponse>('/users/kpi-stats');
  },
};

// Create a named variable for the API object
const api = {
  auth: authApi,
  timer: timerApi,
  message: messageApi,
  user: userApi,
};

export default api; 