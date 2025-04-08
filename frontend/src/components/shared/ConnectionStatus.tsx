import { useState, useEffect } from 'react';
import { Badge } from "../../components/ui/badge";
import { toast } from 'react-hot-toast';
import { WifiIcon, WifiOffIcon } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  const [prevConnected, setPrevConnected] = useState<boolean | null>(null);
  
  // Show toast notification when connection state changes
  useEffect(() => {
    if (prevConnected === null) {
      // Initial state, just set the value
      setPrevConnected(isConnected);
      return;
    }
    
    if (prevConnected !== isConnected) {
      if (isConnected) {
        toast.success('Connection restored. Data updates are live.', { duration: 2000, icon: '🔌' });
      } else {
        toast.error('Connection lost. Data updates may be delayed.', { 
          duration: 4000, 
          icon: '⚠️',
        });
      }
      setPrevConnected(isConnected);
    }
  }, [isConnected, prevConnected]);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isConnected ? "success" : "destructive"}
        className="flex items-center gap-1 px-2 py-1 shadow-md"
      >
        {isConnected ? (
          <>
            <WifiIcon className="h-3 w-3" />
            <span className="text-xs">Connected</span>
          </>
        ) : (
          <>
            <WifiOffIcon className="h-3 w-3" />
            <span className="text-xs">Offline</span>
          </>
        )}
      </Badge>
    </div>
  );
} 