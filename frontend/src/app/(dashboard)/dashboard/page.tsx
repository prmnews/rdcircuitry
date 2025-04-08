"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import UserKpiGrid from "@/components/dashboard/UserKpiGrid";
import CurrentTimeCard from "@/components/dashboard/CurrentTimeCard";
import EstimatedExpirationCard from "@/components/dashboard/EstimatedExpirationCard";
import TimeRemainingCard from "@/components/dashboard/TimeRemainingCard";
import TimeRemainingProgress from "@/components/dashboard/TimeRemainingProgress";
import ResetEventsCard from "@/components/dashboard/ResetEventsCard";
import TimeRemainingGraph from "@/components/dashboard/TimeRemainingGraph";
import { User, TimerState } from "@/types";
import { authApi, timerApi } from "@/services/api";
import { toast } from 'react-hot-toast';
import useWebSocket from "@/hooks/useWebSocket";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousExpiredState = useRef<boolean | null>(null);
  const [timeRemainingHistory, setTimeRemainingHistory] = useState<{ hour: number; value: number }[]>([]);
  
  // Fetch data function for reuse
  const fetchData = useCallback(async (showLoadingState = true, retryCount = 0) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      
      // Fetch current user data
      let userData;
      try {
        userData = await authApi.getCurrentUser();
        if (userData.user) {
          setUser(userData.user);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Continue execution even if user data fails
      }
      
      // Fetch timer state
      try {
        const timerData = await timerApi.getTimerState();
        setTimerState(timerData);
        
        // Check if timer has just expired
        if (timerData?.isExpired && previousExpiredState.current === false) {
          // Show toast notification for timer expiry
          toast.error('Timer has expired! You have 5 seconds to reset before message countdown begins.', {
            duration: 5000, // 5 seconds
            icon: '⏰',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        }
        
        // Store current expired state for next comparison
        previousExpiredState.current = timerData?.isExpired || false;
      } catch (error) {
        console.error('Error fetching timer state:', error);
        // Continue execution even if timer state fails
      }
      
      // Fetch time remaining history data
      try {
        const historyData = await timerApi.getTimeRemainingHistory();
        if (historyData.success) {
          setTimeRemainingHistory(historyData.data);
        }
      } catch (error) {
        console.error('Error fetching time remaining history:', error);
        // Continue execution even if history data fails
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
        toast.error('Error loading dashboard data. Please refresh the page.');
        setError('Failed to load dashboard data after multiple attempts');
      }
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, []);
  
  // Memoized function to update time remaining history
  const updateTimeRemainingHistory = useCallback(() => {
    timerApi.getTimeRemainingHistory()
      .then(historyData => {
        if (historyData.success) {
          setTimeRemainingHistory(historyData.data);
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
    
    toast.error('Timer has expired!', {
      duration: 5000,
      icon: '⚠️'
    });
  }, [fetchData]);
  
  // Setup websocket event handlers
  useWebSocket({
    onTimerReset: handleTimerReset,
    onTimerExpired: handleTimerExpired
  });
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
    
    // Refresh every 30 seconds as a fallback
    const interval = setInterval(() => fetchData(false), 30000);
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor system performance and user statistics
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
    </div>
  );
} 