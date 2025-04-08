import { useState } from 'react';
import { User } from '@/types';
import { useRouter } from 'next/navigation';
import useTimezone from '@/hooks/useTimezone';
import { toast } from 'react-hot-toast';
import { timerApi } from '@/services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface EstimatedExpirationCardProps {
  expirationTime?: string | null;
  userData?: User | null;
  onReset?: (newExpirationTime: string) => void;
}

export default function EstimatedExpirationCard({ 
  expirationTime, 
  userData, 
  onReset 
}: EstimatedExpirationCardProps) {
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const { toLocalTime } = useTimezone(userData);
  
  const handleReset = async () => {
    if (isResetting) return; // Prevent double-clicks
    
    try {
      setIsResetting(true);
      
      const response = await timerApi.resetTimer();
      
      if (response.success) {
        toast.success('Timer reset successful');
        
        if (onReset && response.newExpirationTime) {
          onReset(response.newExpirationTime);
        }
      } else {
        toast.error('Failed to reset timer');
      }
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast.error('Failed to reset timer');
    } finally {
      setIsResetting(false);
    }
  };
  
  const formatDateTime = (date: Date | null): string => {
    if (!date) return 'N/A';
    
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  const localExpirationTime = toLocalTime(expirationTime || null);
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Estimated Expiration</CardTitle>
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatDateTime(localExpirationTime)}</div>
        <div className="mt-4">
          <Button 
            className="w-full" 
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Reset Timer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 