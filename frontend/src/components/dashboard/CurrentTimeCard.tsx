import { useState, useEffect } from 'react';
import { User } from '@/types';
import useTimezone from '@/hooks/useTimezone';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface CurrentTimeCardProps {
  userData?: User | null;
}

export default function CurrentTimeCard({ userData }: CurrentTimeCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toLocalTime, userTimezone } = useTimezone(userData);
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format the date
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  // Format the time
  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  const localTime = toLocalTime(currentTime);
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Time</CardTitle>
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatTime(localTime)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDate(localTime)}
        </p>
        <p className="text-xs text-muted-foreground">
          {userTimezone.timeZone} (GMT{userTimezone.gmtOffset >= 0 ? '+' : ''}{userTimezone.gmtOffset})
        </p>
      </CardContent>
    </Card>
  );
} 