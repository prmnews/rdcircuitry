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
  
  // Store callback references to prevent unnecessary socket reconnections
  const callbacksRef = useRef({
    onTimerReset,
    onTimerExpired,
    onMessageTimerStarted,
    onMessageTimerExpired
  });
  
  // Update the refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onTimerReset,
      onTimerExpired,
      onMessageTimerStarted,
      onMessageTimerExpired
    };
  }, [onTimerReset, onTimerExpired, onMessageTimerStarted, onMessageTimerExpired]);

  useEffect(() => {
    // Create socket connection
    const wsUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    const socketInstance = io(wsUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    socketInstance.on('connect', () => {
      console.log('WebSocket connected with ID:', socketInstance.id);
      setState(prev => ({ ...prev, connected: true }));
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setState(prev => ({ ...prev, connected: false }));
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
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
      
      if (callbacksRef.current.onTimerReset) {
        callbacksRef.current.onTimerReset(data);
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
      
      if (callbacksRef.current.onTimerExpired) {
        callbacksRef.current.onTimerExpired(data);
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
      
      if (callbacksRef.current.onMessageTimerStarted) {
        callbacksRef.current.onMessageTimerStarted(data);
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
      
      if (callbacksRef.current.onMessageTimerExpired) {
        callbacksRef.current.onMessageTimerExpired(data);
      }
    });
    
    setSocket(socketInstance);
    
    // Cleanup
    return () => {
      console.log('Cleaning up WebSocket connection');
      socketInstance.disconnect();
    };
  }, []); // Empty dependency array - only create the socket once

  return {
    ...state,
    socket
  };
} 