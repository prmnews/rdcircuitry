import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { timerApi } from '@/services/api';
import { TimerState } from '@/types';
import { Loader2 } from 'lucide-react';
import CurrentTimeCard from './CurrentTimeCard';
import EstimatedExpirationCard from './EstimatedExpirationCard';
import TimeRemainingCard from './TimeRemainingCard';
import ResetEventsCard from './ResetEventsCard';
import UserKpiGrid from './UserKpiGrid';
import useWebSocket from '@/hooks/useWebSocket';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Transform session data to match the User type
  const userData = session?.user ? {
    id: session.user.name || 'anonymous',
    userName: session.user.name || 'User',
    role: 'user' as const,
    location: {
      countryCode: 'US',
      countryName: 'United States',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      gmtOffset: '0'
    }
  } : null;
  
  // Initialize WebSocket connection
  useWebSocket({
    onTimerReset: (data) => {
      toast.success(`Timer reset by ${data.resetBy}`);
      fetchTimerState();
    },
    onTimerExpired: () => {
      toast('Timer has expired');
      fetchTimerState();
    },
    onMessageTimerStarted: () => {
      toast('Message timer started');
      fetchTimerState();
    },
    onMessageTimerExpired: () => {
      toast('Message has been sent');
      fetchTimerState();
    },
  });
  
  const fetchTimerState = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await timerApi.getTimerState();
      setTimerState(data);
    } catch (err) {
      console.error('Error fetching timer state:', err);
      setError('Failed to load timer information');
      toast.error('Failed to load timer information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTimerState();
    
    // Refresh timer state every 30 seconds as fallback
    const interval = setInterval(fetchTimerState, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const handleTimerReset = async (reason?: string) => {
    try {
      const result = await timerApi.resetTimer(reason);
      setTimerState(prev => 
        prev ? {
          ...prev,
          isExpired: false,
          targetTime: result.newExpirationTime,
          remainingTime: new Date(result.newExpirationTime).getTime() - new Date().getTime()
        } : null
      );
      toast.success('Timer reset successfully');
    } catch (err) {
      console.error('Error resetting timer:', err);
      toast.error('Failed to reset timer');
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl">Please log in to view the dashboard</h2>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <h2 className="text-xl">{error}</h2>
        <button 
          onClick={fetchTimerState}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrentTimeCard userData={userData} />
        <EstimatedExpirationCard 
          expirationTime={timerState?.targetTime} 
          userData={userData}
          onReset={handleTimerReset}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeRemainingCard
          expirationTime={timerState?.targetTime}
          isExpired={timerState?.isExpired || false}
          remainingTime={timerState?.remainingTime}
        />
        <ResetEventsCard resetEvents={timerState?.resetEvents} />
      </div>
      
      <UserKpiGrid />
    </div>
  );
} 