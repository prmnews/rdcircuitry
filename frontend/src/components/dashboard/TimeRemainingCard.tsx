import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface TimeRemainingCardProps {
  expirationTime?: string | null;
  initialMinutes?: number;
}

export default function TimeRemainingCard({ 
  expirationTime, 
  initialMinutes = 5 
}: TimeRemainingCardProps) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [alertLevel, setAlertLevel] = useState<'normal' | 'yellow' | 'red' | 'expired'>('normal');
  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    if (!expirationTime) return;
    
    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiration = new Date(expirationTime);
      const diff = expiration.getTime() - now.getTime();
      
      // If timer has expired
      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        setAlertLevel('expired');
        setIsExpired(true);
        return;
      }
      
      setIsExpired(false);
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ hours, minutes, seconds });
      
      // Set alert levels based on env variables
      const totalMinutesRemaining = hours * 60 + minutes + seconds / 60;
      const redMinutes = Number(process.env.NEXT_PUBLIC_MESSAGE_RED_MINUTES || 1);
      const yellowMinutes = Number(process.env.NEXT_PUBLIC_MESSAGE_YELLOW_MINUTES || 2);
      
      if (totalMinutesRemaining <= redMinutes) {
        setAlertLevel('red');
      } else if (totalMinutesRemaining <= yellowMinutes) {
        setAlertLevel('yellow');
      } else {
        setAlertLevel('normal');
      }
    };
    
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [expirationTime]);
  
  // Format the time remaining display
  const formatTimeDisplay = (): string => {
    const { hours, minutes, seconds } = timeRemaining;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Get background color based on alert level
  const getBackgroundColor = (): string => {
    if (alertLevel === 'expired') return 'bg-red-100';
    if (alertLevel === 'red') return 'bg-red-50';
    if (alertLevel === 'yellow') return 'bg-amber-50';
    return '';
  };
  
  // Get text color based on alert level
  const getTextColor = (): string => {
    if (alertLevel === 'expired') return 'text-red-700';
    if (alertLevel === 'red') return 'text-red-500';
    if (alertLevel === 'yellow') return 'text-amber-500';
    return '';
  };
  
  return (
    <Card className={`h-full ${getBackgroundColor()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
        <AlertTriangle className={`h-4 w-4 ${getTextColor()} ${isExpired ? 'animate-pulse' : ''}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getTextColor()} ${isExpired ? 'animate-pulse' : ''}`}>
          {isExpired ? "EXPIRED" : formatTimeDisplay()}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isExpired ? "Please reset timer" : "Current countdown"}
        </p>
      </CardContent>
    </Card>
  );
} 