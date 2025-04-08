"use client";

import { useState, useEffect, useRef } from 'react';
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [loading, setLoading] = useState(true);
  const previousExpiredState = useRef<boolean | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch current user data
        const userData = await authApi.getCurrentUser();
        if (userData.user) {
          setUser(userData.user);
        }
        
        // Fetch timer state
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
          
          // After 5 seconds, if we were to implement message lag timer activation, it would go here
        }
        
        // Store current expired state for next comparison
        previousExpiredState.current = timerData?.isExpired || false;
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh every 5 seconds instead of 30 to catch expiration faster
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const handleTimerReset = (newExpirationTime: string) => {
    setTimerState(prev => prev ? {
      ...prev,
      targetTime: newExpirationTime,
      isExpired: false, // Update expired state on reset
      resetEvents: {
        last24Hours: (prev.resetEvents?.last24Hours || 0) + 1,
        total: (prev.resetEvents?.total || 0) + 1
      }
    } : null);
    
    // Also update our ref to avoid showing the toast again
    previousExpiredState.current = false;
  };
  
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
          onReset={handleTimerReset}
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
          <TimeRemainingGraph />
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1">
        <UserKpiGrid />
      </div>
    </div>
  );
} 