import { useState, useEffect, useRef } from 'react';
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
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface WebSocketState {
  lastEvent: {
    type: string;
    data: TimerResetEvent | TimerExpiredEvent | MessageTimerStartedEvent | MessageTimerExpiredEvent;
    timestamp: string;
  } | null;
  connected: boolean;
}

export const useWebSocket = ({
  onTimerReset,
  onTimerExpired,
  onMessageTimerStarted,
  onMessageTimerExpired,
  onConnect,
  onDisconnect
}: WebSocketHookProps = {}) => {
  const [state, setState] = useState<WebSocketState>({
    lastEvent: null,
    connected: false,
  });
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({
    onTimerReset,
    onTimerExpired,
    onMessageTimerStarted,
    onMessageTimerExpired,
    onConnect,
    onDisconnect
  });

  // Update the callbacks ref when the props change
  useEffect(() => {
    callbacksRef.current = {
      onTimerReset,
      onTimerExpired,
      onMessageTimerStarted,
      onMessageTimerExpired,
      onConnect,
      onDisconnect
    };
  }, [onTimerReset, onTimerExpired, onMessageTimerStarted, onMessageTimerExpired, onConnect, onDisconnect]);

  useEffect(() => {
    if (!socketRef.current) {
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000', {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000, // Start with 1s delay
        reconnectionDelayMax: 30000, // Max delay of 30s
        randomizationFactor: 0.5, // Add some randomization to prevent connection storms
        timeout: 20000, // Timeout for connection
        transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setState(prev => ({ ...prev, connected: true }));
        if (callbacksRef.current.onConnect) {
          callbacksRef.current.onConnect();
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`WebSocket disconnected: ${reason}`);
        setState(prev => ({ ...prev, connected: false }));
        if (callbacksRef.current.onDisconnect) {
          callbacksRef.current.onDisconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
      
      socket.on('reconnect', (attempt) => {
        console.log(`WebSocket reconnected after ${attempt} attempts`);
      });
      
      socket.on('reconnect_attempt', (attempt) => {
        console.log(`WebSocket reconnection attempt ${attempt}`);
      });
      
      socket.on('reconnect_error', (error) => {
        console.error('WebSocket reconnection error:', error);
      });
      
      socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed after all attempts');
      });

      // Register event listeners
      socket.on('timer-reset', (data: TimerResetEvent) => {
        setState(prev => ({
          ...prev,
          lastEvent: {
            type: 'timer-reset',
            data,
            timestamp: new Date().toISOString()
          }
        }));
        
        if (callbacksRef.current.onTimerReset) {
          callbacksRef.current.onTimerReset(data);
        }
      });
      
      socket.on('timer-expired', (data: TimerExpiredEvent) => {
        setState(prev => ({
          ...prev,
          lastEvent: {
            type: 'timer-expired',
            data,
            timestamp: new Date().toISOString()
          }
        }));
        
        if (callbacksRef.current.onTimerExpired) {
          callbacksRef.current.onTimerExpired(data);
        }
      });
      
      socket.on('message-timer-started', (data: MessageTimerStartedEvent) => {
        setState(prev => ({
          ...prev,
          lastEvent: {
            type: 'message-timer-started',
            data,
            timestamp: new Date().toISOString()
          }
        }));
        
        if (callbacksRef.current.onMessageTimerStarted) {
          callbacksRef.current.onMessageTimerStarted(data);
        }
      });
      
      socket.on('message-timer-expired', (data: MessageTimerExpiredEvent) => {
        setState(prev => ({
          ...prev,
          lastEvent: {
            type: 'message-timer-expired',
            data,
            timestamp: new Date().toISOString()
          }
        }));
        
        if (callbacksRef.current.onMessageTimerExpired) {
          callbacksRef.current.onMessageTimerExpired(data);
        }
      });
    }

    // Cleanup
    return () => {
      console.log('Cleaning up WebSocket connection');
      socketRef.current?.disconnect();
    };
  }, []); // Empty dependency array - only create the socket once

  return {
    ...state,
    socket: socketRef.current
  };
}

// Also export as default for compatibility
export default useWebSocket; 