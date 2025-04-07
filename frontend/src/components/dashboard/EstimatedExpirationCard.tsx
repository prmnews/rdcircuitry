import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, RefreshCw } from "lucide-react";
import useTimezone from '@/hooks/useTimezone';
import { timerApi } from '@/services/api';
import type { User } from '@/types';
import { toast } from 'react-hot-toast';

interface EstimatedExpirationCardProps {
  expirationTime?: string;
  userData?: Partial<User> | null;
  onReset?: (reason?: string) => void;
}

export default function EstimatedExpirationCard({ 
  expirationTime, 
  userData,
  onReset 
}: EstimatedExpirationCardProps) {
  const [isResetting, setIsResetting] = useState(false);
  const { toLocalTime } = useTimezone(userData?.location);
  
  // Format the date and time
  const formatDateTime = (date: Date | null): string => {
    if (!date) return 'N/A';
    
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      // Use the provided onReset callback or call the API directly
      if (onReset) {
        onReset();
      } else {
        await timerApi.resetTimer('Manual reset from dashboard');
        toast.success('Timer reset successfully');
      }
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast.error('Failed to reset timer');
    } finally {
      setIsResetting(false);
    }
  };
  
  const localExpirationTime = toLocalTime(expirationTime ? new Date(expirationTime) : null);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Estimated Expiration</CardTitle>
          <CardDescription>
            When the timer will expire
          </CardDescription>
        </div>
        <Timer className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-2xl font-bold tracking-tighter text-center py-2">
            {formatDateTime(localExpirationTime)}
          </div>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Timer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 