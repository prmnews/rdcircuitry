"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UserKpiGrid from "@/components/dashboard/UserKpiGrid";
import CurrentTimeCard from "@/components/dashboard/CurrentTimeCard";
import EstimatedExpirationCard from "@/components/dashboard/EstimatedExpirationCard";
import TimeRemainingCard from "@/components/dashboard/TimeRemainingCard";
import TimeRemainingProgress from "@/components/dashboard/TimeRemainingProgress";
import ResetEventsCard from "@/components/dashboard/ResetEventsCard";
import TimeRemainingGraph from "@/components/dashboard/TimeRemainingGraph";
import ConnectionStatus from "@/components/shared/ConnectionStatus";
import { User, TimerState, UserResponse, TimeHistoryResponse } from "@/types";
import { authApi, timerApi } from "@/services/api";
import { toast } from 'react-hot-toast';
import useWebSocket from "@/hooks/useWebSocket";

// Default values for health check - can be overridden by env
const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds
const DEFAULT_HEALTH_BUFFER = 15000; // 15 seconds buffer

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousExpiredState = useRef<boolean | null>(null);
  const [timeRemainingHistory, setTimeRemainingHistory] = useState<{ hour: number; value: number }[]>([]);
  const [lastDataUpdate, setLastDataUpdate] = useState<number>(Date.now());
  const [dataConnectionHealthy, setDataConnectionHealthy] = useState<boolean>(true);
  
  // Calculate actual health check timeout based on env or defaults
  const healthCheckTimeout = 
    Number(process.env.NEXT_PUBLIC_WEBHOOK_INTERVAL_SECONDS || 0) * 1000 || 
    (DEFAULT_POLLING_INTERVAL + DEFAULT_HEALTH_BUFFER);
  
  // Fetch data function for reuse
  const fetchData = useCallback(async (showLoadingState = true, retryCount = 0) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      
      let hasConnectionError = false;
      
      // Fetch current user data
      let userData;
      try {
        userData = await authApi.getCurrentUser();

        // Check for network connectivity issues
        if (userData.connectionError) {
          hasConnectionError = true;
        }
        // Otherwise process user data normally
        else if (userData.success !== false && userData.user) {
          setUser(userData.user);
          console.log('User data:', userData);
          console.log('User location:', userData?.user?.location);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      
      // Fetch timer state
      try {
        const timerData = await timerApi.getTimerState();
        
        // Check for network connectivity issues
        if (timerData.connectionError) {
          hasConnectionError = true;
          // Don't update timer state with potentially incomplete/invalid data
        }
        // Otherwise process the timer data normally
        else if (timerData) {
          setTimerState(timerData);
          
          // Update the last successful data update timestamp
          setLastDataUpdate(Date.now());
          setDataConnectionHealthy(true);
          
          // Check for isRDI state - immediate redirect
          if (timerData.isRDI) {
            console.log('🔴 DEBUGGING: isRDI is true, redirecting to /message/');
            router.push('/message');
            return;
          }
          
          // Check if timer has just expired
          if (timerData?.isExpired && previousExpiredState.current === false) {
            // Show toast notification for timer expiry
            console.log('🔴 DEBUGGING: Timer has expired! Starting 5-second grace period');
            
            // Create a function to handle grace period expiration
            const handleGracePeriodExpired = () => {
              console.log('🔴 DEBUGGING: Grace period toast expired, redirecting to /message/');
              // Only redirect if the timer is still expired
              if (timerData?.isExpired) {
                router.push('/message');
              }
            };
            
            // Set a timeout to redirect after the grace period
            setTimeout(handleGracePeriodExpired, 5000);
            
            toast.error('Timer has expired! You have 5 seconds to reset before message countdown begins.', {
              duration: 5000, // 5 seconds
              icon: '⏰',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              }
            });
          }
          
          // Store current expired state for next comparison
          previousExpiredState.current = timerData?.isExpired || false;
        }
      } catch (error) {
        console.error('Error fetching timer state:', error);
      }
      
      // Fetch time remaining history data
      try {
        const historyData = await timerApi.getTimeRemainingHistory();
        
        // Check for network connectivity issues
        if (historyData.connectionError) {
          hasConnectionError = true;
          // Don't update with potentially incomplete data
        }
        // Otherwise process the history data normally
        else if (historyData.success) {
          setTimeRemainingHistory(historyData.data);
        }
      } catch (error) {
        console.error('Error fetching time remaining history:', error);
      }
      
      // If we detected any connection errors, mark data as unhealthy
      if (hasConnectionError) {
        console.warn('Network connectivity issues detected');
        setDataConnectionHealthy(false);
        
        // Only show toast once per session for connection issues
        toast.error('Connection to server lost. Displaying last known data.', {
          id: 'connection-error', // Use ID to prevent duplicate toasts
          duration: 5000
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
        
        setTimeout(() => {
          fetchData(false, retryCount + 1);
        }, delay);
      } else {
        // Only show toast for persistent failures
        if (!dataConnectionHealthy) {
          toast.error('Error loading dashboard data. Updates may be delayed.', {
            id: 'dashboard-error', // Use ID to prevent duplicate toasts
          });
        }
        setError('Failed to load dashboard data after multiple attempts');
      }
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, [dataConnectionHealthy, router]);

  // Check data freshness periodically
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const dataAge = Date.now() - lastDataUpdate;
      setDataConnectionHealthy(dataAge < healthCheckTimeout);
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(healthCheckInterval);
  }, [lastDataUpdate, healthCheckTimeout]);
  
  // Memoized function to update time remaining history
  const updateTimeRemainingHistory = useCallback(() => {
    timerApi.getTimeRemainingHistory()
      .then(historyData => {
        if (historyData.success) {
          setTimeRemainingHistory(historyData.data);
          // Mark as updated since we successfully got new data
          setLastDataUpdate(Date.now());
          setDataConnectionHealthy(true);
        }
      })
      .catch(err => console.error('Error updating time graph after reset:', err));
  }, []);
  
  // Memoized websocket handlers to prevent constant reconnections
  const handleTimerReset = useCallback((data: { 
    resetBy: string; 
    newExpirationTime: string; 
    resetTime: string; 
    reason?: string;
    remainder?: number;
  }) => {
    console.log('WebSocket: Timer reset event received', data);
    // Update timer state from socket data
    setTimerState(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        isExpired: false,
        targetTime: data.newExpirationTime,
        resetEvents: prev.resetEvents ? {
          last24Hours: (prev.resetEvents.last24Hours || 0) + 1,
          total: (prev.resetEvents.total || 0) + 1
        } : undefined
      };
    });
    
    // Reset expired state
    previousExpiredState.current = false;
    
    // Mark as updated since we got new data via websocket
    setLastDataUpdate(Date.now());
    setDataConnectionHealthy(true);
    
    // Refresh time remaining graph data after a short delay
    setTimeout(updateTimeRemainingHistory, 2000); // Wait 2 seconds for backend to update
    
    toast.success(`Timer reset by ${data.resetBy}`, {
      duration: 3000,
      icon: '🔄'
    });
  }, [updateTimeRemainingHistory]);
  
  const handleTimerExpired = useCallback((data: { 
    expiredAt: string; 
    messageData?: { 
      text: string; 
      url?: string; 
    }; 
  }) => {
    console.log('WebSocket: Timer expired event received', data);
    // Refresh data when timer expires
    fetchData(false);
    
    // Mark as updated since we received a websocket event
    setLastDataUpdate(Date.now());
    setDataConnectionHealthy(true);
    
    toast.error('Timer has expired!', {
      duration: 5000,
      icon: '⚠️'
    });
  }, [fetchData]);
  
  // Setup websocket event handlers
  const { connected } = useWebSocket({
    onTimerReset: handleTimerReset,
    onTimerExpired: handleTimerExpired,
    onConnect: () => {
      // We still track WebSocket connection, but don't directly use it for the indicator
      console.log('WebSocket connected');
      
      // However, a successful websocket connection is a good indicator we have connectivity
      setLastDataUpdate(Date.now());
      setDataConnectionHealthy(true);
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
      // We don't immediately mark as unhealthy, we wait for data staleness
    }
  });
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
    
    // Refresh every 30 seconds as a fallback
    const interval = setInterval(() => fetchData(false), DEFAULT_POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  // Memoized function for the reset button callback
  const handleUserTimerReset = useCallback((newExpirationTime: string) => {
    setTimerState(prev => prev ? {
      ...prev,
      targetTime: newExpirationTime,
      isExpired: false,
      resetEvents: {
        last24Hours: (prev.resetEvents?.last24Hours || 0) + 1,
        total: (prev.resetEvents?.total || 0) + 1
      }
    } : null);
    
    // Also update our ref to avoid showing the toast again
    previousExpiredState.current = false;
    
    // Refresh time remaining graph data after a short delay
    setTimeout(updateTimeRemainingHistory, 2000); // Wait 2 seconds for backend to update
  }, [updateTimeRemainingHistory]);
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">User Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          {user?.location?.timeZone ? 
            `${user.location.timeZone} | GMT ${(Number(user.location.gmtOffset) >= 0 ? '+' : '')}${user.location.gmtOffset}` : 
            'Loading location data...'}
        </p>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <CurrentTimeCard userData={user} />
        <EstimatedExpirationCard 
          expirationTime={timerState?.targetTime} 
          userData={user}
          onReset={handleUserTimerReset}
        />
        <TimeRemainingCard expirationTime={timerState?.targetTime} />
        <ResetEventsCard resetEvents={timerState?.resetEvents} />
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <TimeRemainingProgress 
          expirationTime={timerState?.targetTime} 
          initialMinutes={Number(process.env.NEXT_PUBLIC_TIMER_INITIAL_MINUTES || 3)}
        />
        
        <div className="sm:col-span-1 lg:col-span-1">
          <TimeRemainingGraph data={timeRemainingHistory} />
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1">
        <UserKpiGrid />
      </div>
      
      {/* Connection status indicator based on data freshness */}
      <ConnectionStatus isConnected={dataConnectionHealthy} />
    </div>
  );
} 