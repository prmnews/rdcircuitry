import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import useTimezone from '@/hooks/useTimezone';
import type { User } from '@/types';

interface CurrentTimeCardProps {
  userData?: Partial<User> | null;
}

export default function CurrentTimeCard({ userData }: CurrentTimeCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toLocalTime, userTimezone } = useTimezone(userData?.location);
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format the date
  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  // Format the time
  const formatTime = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  const localTime = toLocalTime(currentTime);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Current Time</CardTitle>
          <CardDescription>
            Based on {userData?.userName || 'your'} timezone
          </CardDescription>
        </div>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold tracking-tighter">
            {formatTime(localTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(localTime)}
          </div>
          <div className="text-xs bg-muted inline-block px-2 py-1 rounded-md">
            {userTimezone.timeZone} (GMT{userTimezone.gmtOffset >= 0 ? '+' : ''}{userTimezone.gmtOffset})
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 