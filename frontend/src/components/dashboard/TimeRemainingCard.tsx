import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle } from "lucide-react";

interface TimeRemainingCardProps {
  expirationTime?: string;
  isExpired?: boolean;
  remainingTime?: number;
}

export default function TimeRemainingCard({ 
  expirationTime, 
  isExpired = false,
  remainingTime: initialRemainingTime 
}: TimeRemainingCardProps) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [alertLevel, setAlertLevel] = useState<'normal' | 'warning' | 'danger'>('normal');
  const [progressValue, setProgressValue] = useState(100);
  
  useEffect(() => {
    if (!expirationTime && initialRemainingTime === undefined) return;
    
    const calculateTimeRemaining = () => {
      // If we already know it's expired, set zeros
      if (isExpired) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        setAlertLevel('danger');
        setProgressValue(0);
        return;
      }
      
      let diff: number;
      
      // Use the provided remainingTime if available, otherwise calculate it
      if (initialRemainingTime !== undefined) {
        diff = initialRemainingTime;
      } else {
        const now = new Date();
        const expiration = new Date(expirationTime || '');
        diff = expiration.getTime() - now.getTime();
      }
      
      // If timer has expired
      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        setAlertLevel('danger');
        setProgressValue(0);
        return;
      }
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ hours, minutes, seconds });
      
      // Calculate total minutes remaining for alert level
      const totalMinutesRemaining = hours * 60 + minutes + seconds / 60;
      
      // Set alert level based on time remaining
      const lowMinutes = parseInt(process.env.NEXT_PUBLIC_KPI_LOW_MINUTES || '1');
      const avgMinutes = parseInt(process.env.NEXT_PUBLIC_KPI_AVERAGE_MINUTES || '2');
      
      if (totalMinutesRemaining <= lowMinutes) {
        setAlertLevel('danger');
      } else if (totalMinutesRemaining <= avgMinutes) {
        setAlertLevel('warning');
      } else {
        setAlertLevel('normal');
      }
      
      // Calculate progress value (0-100)
      const maxTime = 10 * 60 * 1000; // 10 minutes in ms
      setProgressValue(Math.min(100, Math.max(0, (diff / maxTime) * 100)));
    };
    
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [expirationTime, initialRemainingTime, isExpired]);
  
  // Format the time with padded zeros
  const formatTimeDisplay = (): string => {
    const { hours, minutes, seconds } = timeRemaining;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card>
      <CardHeader className={`flex flex-row items-center justify-between pb-2 ${alertLevel === 'danger' ? 'text-red-500' : ''}`}>
        <div className="space-y-1">
          <CardTitle>Time Remaining</CardTitle>
          <CardDescription>
            Until timer expiration
          </CardDescription>
        </div>
        {alertLevel === 'danger' ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`text-4xl font-bold tracking-tighter text-center py-4 ${alertLevel === 'danger' ? 'text-red-500 animate-pulse' : ''}`}>
          {formatTimeDisplay()}
        </div>
        
        <Progress 
          value={progressValue} 
          className="h-2"
        />
        
        <div className="text-xs text-center text-muted-foreground">
          {isExpired ? 'Timer has expired!' : 'Countdown to expiration'}
        </div>
      </CardContent>
    </Card>
  );
} 