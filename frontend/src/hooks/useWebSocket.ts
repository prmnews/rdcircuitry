import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  TimerResetEvent,
  TimerExpiredEvent,
  MessageTimerStartedEvent,
  MessageTimerExpiredEvent
} from '@/types';

interface WebSocketHookProps {
  onTimerReset?: (data: TimerResetEvent) => void;
  onTimerExpired?: (data: TimerExpiredEvent) => void;
  onMessageTimerStarted?: (data: MessageTimerStartedEvent) => void;
  onMessageTimerExpired?: (data: MessageTimerExpiredEvent) => void;
}

interface WebSocketState {
  lastEvent: {
    type: string;
    data: TimerResetEvent | TimerExpiredEvent | MessageTimerStartedEvent | MessageTimerExpiredEvent;
    timestamp: string;
  } | null;
  connected: boolean;
}

export default function useWebSocket({
  onTimerReset,
  onTimerExpired,
  onMessageTimerStarted,
  onMessageTimerExpired
}: WebSocketHookProps = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    lastEvent: null,
    connected: false
  });

  useEffect(() => {
    // Create socket connection
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socketInstance = io(wsUrl);
    
    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setState(prev => ({ ...prev, connected: true }));
    });
    
    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setState(prev => ({ ...prev, connected: false }));
    });
    
    // Register event listeners
    socketInstance.on('timer-reset', (data: TimerResetEvent) => {
      setState(prev => ({
        ...prev,
        lastEvent: {
          type: 'timer-reset',
          data,
          timestamp: new Date().toISOString()
        }
      }));
      
      if (onTimerReset) {
        onTimerReset(data);
      }
    });
    
    socketInstance.on('timer-expired', (data: TimerExpiredEvent) => {
      setState(prev => ({
        ...prev,
        lastEvent: {
          type: 'timer-expired',
          data,
          timestamp: new Date().toISOString()
        }
      }));
      
      if (onTimerExpired) {
        onTimerExpired(data);
      }
    });
    
    socketInstance.on('message-timer-started', (data: MessageTimerStartedEvent) => {
      setState(prev => ({
        ...prev,
        lastEvent: {
          type: 'message-timer-started',
          data,
          timestamp: new Date().toISOString()
        }
      }));
      
      if (onMessageTimerStarted) {
        onMessageTimerStarted(data);
      }
    });
    
    socketInstance.on('message-timer-expired', (data: MessageTimerExpiredEvent) => {
      setState(prev => ({
        ...prev,
        lastEvent: {
          type: 'message-timer-expired',
          data,
          timestamp: new Date().toISOString()
        }
      }));
      
      if (onMessageTimerExpired) {
        onMessageTimerExpired(data);
      }
    });
    
    setSocket(socketInstance);
    
    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [onTimerReset, onTimerExpired, onMessageTimerStarted, onMessageTimerExpired]);

  return {
    ...state,
    socket
  };
} 