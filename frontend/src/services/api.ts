import { TimerState, User, UserKpiStats } from '@/types';

const API_BASE_URL = '/api';

// Get auth token from local storage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Common fetch wrapper with auth and error handling
async function fetchWithAuth<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const requestOptions = {
    ...options,
    headers: token ? { ...headers, 'x-auth-token': token } : headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  
  return await response.json();
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
    return fetchWithAuth<{ success: boolean; user: User }>('/auth/me');
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
      newExpirationTime: string;
      resetBy: string;
      resets: { last24Hours: number; total: number }
    }>('/timer/reset', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Manual reset from dashboard' }),
    });
  },
};

// Message API calls
export const messageApi = {
  startMessageTimer: async (url?: string) => {
    return fetchWithAuth<{ 
      success: boolean; 
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
};

// User KPI statistics
export const userApi = {
  getUserKpiStats: async () => {
    return fetchWithAuth<{ success: boolean; users: UserKpiStats[] }>('/users/kpi-stats');
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