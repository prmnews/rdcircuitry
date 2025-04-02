# Sprint 5: WebSocket Integration

## Goal
Implement real-time communication between clients using WebSockets, ensuring timer synchronization across all connected clients and providing immediate notifications of timer events.

## Implementation

### Step 1: Set up WebSocket foundation
```bash
# Navigate to the project root
cd /d/Repo/rdi

# Create WebSocket-related directories and files
mkdir -p lib/websocket
touch lib/websocket/server.js
touch lib/websocket/events.js
mkdir -p app/hooks
touch app/hooks/useSocket.js
touch app/hooks/useSocketContext.js
touch app/components/shared/WebSocketProvider.jsx
```

### Step 2: Implement WebSocket server in Node.js environment

```javascript
// lib/websocket/server.js
const { Server } = require('socket.io');
const { logger } = require('../logger');

let io = null;
let isInitialized = false;

/**
 * Initialize the Socket.IO server
 * @param {object} httpServer - HTTP server instance
 */
function initSocketServer(httpServer) {
  if (isInitialized) {
    logger.info('WebSocket server already initialized');
    return;
  }

  try {
    io = new Server(httpServer, {
      path: '/api/socketio',
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? false 
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('authenticate', (userData) => {
        if (userData && userData.userName) {
          socket.userName = userData.userName;
          logger.info(`Client authenticated: ${socket.id}, User: ${userData.userName}`);
          socket.join('authenticated');
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
      
      // Development-only event simulation endpoint
      if (process.env.NODE_ENV !== 'production') {
        socket.on('simulate-event', (eventData) => {
          if (!eventData || !eventData.type) return;
          
          logger.info(`Simulating event: ${eventData.type}`);
          io.emit(eventData.type, eventData.data || {});
        });
      }
    });

    isInitialized = true;
    logger.info('WebSocket server initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize WebSocket server:', error);
    throw error;
  }
}

/**
 * Check if the WebSocket server is initialized
 * @returns {boolean} - Whether the server is initialized
 */
function isSocketServerInitialized() {
  return isInitialized;
}

/**
 * Get the Socket.IO server instance
 * @returns {object|null} - Socket.IO server instance
 */
function getSocketServer() {
  return io;
}

module.exports = {
  initSocketServer,
  isSocketServerInitialized,
  getSocketServer
};
```

### Step 3: Define WebSocket event emitters

```javascript
// lib/websocket/events.js
const { getSocketServer, isSocketServerInitialized } = require('./server');
const { logger } = require('../logger');

/**
 * Emit a timer reset event to all connected clients
 * @param {object} data - Reset event data
 */
function emitTimerReset(data) {
  if (!isSocketServerInitialized()) {
    logger.warn('WebSocket server not initialized, cannot emit timer-reset');
    return;
  }

  try {
    const io = getSocketServer();
    io.emit('timer-reset', {
      resetBy: data.userName || 'system',
      newExpirationTime: data.newExpirationTime,
      resetTime: data.resetTime || new Date(),
      reason: data.reason
    });
    
    logger.info('Emitted timer-reset event', { data });
  } catch (error) {
    logger.error('Failed to emit timer-reset event:', error);
  }
}

/**
 * Emit a timer expired event to all connected clients
 * @param {object} data - Expiry event data
 */
function emitTimerExpired(data) {
  if (!isSocketServerInitialized()) {
    logger.warn('WebSocket server not initialized, cannot emit timer-expired');
    return;
  }

  try {
    const io = getSocketServer();
    io.emit('timer-expired', {
      expiredAt: data.expiredAt || new Date(),
      messageData: data.messageData
    });
    
    logger.info('Emitted timer-expired event', { data });
  } catch (error) {
    logger.error('Failed to emit timer-expired event:', error);
  }
}

/**
 * Emit a message timer started event to all connected clients
 * @param {object} data - Message timer data
 */
function emitMessageTimerStarted(data) {
  if (!isSocketServerInitialized()) {
    logger.warn('WebSocket server not initialized, cannot emit message-timer-started');
    return;
  }

  try {
    const io = getSocketServer();
    io.emit('message-timer-started', {
      triggerTime: data.triggerTime,
      lagTimeMinutes: data.lagTimeMinutes
    });
    
    logger.info('Emitted message-timer-started event', { data });
  } catch (error) {
    logger.error('Failed to emit message-timer-started event:', error);
  }
}

/**
 * Emit a message timer expired event to all connected clients
 * @param {object} data - Expiry event data
 */
function emitMessageTimerExpired(data) {
  if (!isSocketServerInitialized()) {
    logger.warn('WebSocket server not initialized, cannot emit message-timer-expired');
    return;
  }

  try {
    const io = getSocketServer();
    io.emit('message-timer-expired', {
      expiredAt: data.expiredAt || new Date(),
      messageData: data.messageData
    });
    
    logger.info('Emitted message-timer-expired event', { data });
  } catch (error) {
    logger.error('Failed to emit message-timer-expired event:', error);
  }
}

module.exports = {
  emitTimerReset,
  emitTimerExpired,
  emitMessageTimerStarted,
  emitMessageTimerExpired
};
```

### Step 4: Modify custom server.js to initialize WebSockets

```javascript
// server.js
const express = require('express');
const http = require('http');
const next = require('next');
const { initSocketServer } = require('./lib/websocket/server');
const { logger } = require('./lib/logger');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  // Initialize WebSocket server with the HTTP server
  initSocketServer(httpServer);

  // Handle API routes
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, (err) => {
    if (err) throw err;
    logger.info(`> Ready on http://localhost:${port}`);
  });
}).catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
```

### Step 5: Implement client-side WebSocket hook

```javascript
// app/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

export default function useSocket(options = {}, userData = null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const subscriptionsRef = useRef({});
  
  const {
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
    timeout = 10000,
  } = options;
  
  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;
    
    const host = process.env.NEXT_PUBLIC_API_URL || '';
    
    socketRef.current = io(host, {
      path: '/api/socketio',
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax,
      timeout,
      autoConnect: true,
      withCredentials: true,
    });
    
    const socket = socketRef.current;
    
    // Socket event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate the socket if userData is provided
      if (userData && userData.userName) {
        socket.emit('authenticate', { userName: userData.userName });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    // Clean up socket connection on unmount
    return () => {
      Object.keys(subscriptionsRef.current).forEach((event) => {
        subscriptionsRef.current[event].forEach((callback) => {
          socket.off(event, callback);
        });
      });
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, reconnectionAttempts, reconnectionDelay, reconnectionDelayMax, timeout, userData]);
  
  // Function to manually connect to the socket
  const connect = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.connect();
  }, []);
  
  // Function to manually disconnect from the socket
  const disconnect = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.disconnect();
  }, []);
  
  // Function to subscribe to a socket event
  const subscribe = useCallback((event, callback) => {
    if (!socketRef.current) return () => {};
    
    // Store the subscription
    if (!subscriptionsRef.current[event]) {
      subscriptionsRef.current[event] = [];
    }
    
    subscriptionsRef.current[event].push(callback);
    socketRef.current.on(event, callback);
    
    // Clean up function to unsubscribe
    return () => {
      if (!socketRef.current) return;
      
      socketRef.current.off(event, callback);
      
      // Remove the callback from the subscriptions
      if (subscriptionsRef.current[event]) {
        subscriptionsRef.current[event] = subscriptionsRef.current[event].filter(
          (cb) => cb !== callback
        );
      }
    };
  }, []);
  
  // Function to emit a socket event
  const emit = useCallback((event, data, callback) => {
    if (!socketRef.current || !isConnected) {
      console.warn(`Cannot emit ${event}: socket is not connected`);
      return false;
    }
    
    socketRef.current.emit(event, data, callback);
    return true;
  }, [isConnected]);
  
  return {
    socket: socketRef.current,
    isConnected,
    lastMessage,
    connect,
    disconnect,
    subscribe,
    emit,
  };
}
```

### Step 6: Create WebSocket Context Provider

```javascript
// app/hooks/useSocketContext.js
import { createContext, useContext, useMemo } from 'react';
import useSocket from './useSocket';

const SocketContext = createContext(null);

export function WebSocketProvider({ children, options, userData }) {
  const socket = useSocket(options, userData);
  
  const value = useMemo(() => socket, [
    socket.isConnected,
    socket.lastMessage,
  ]);
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default function useSocketContext() {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
}
```

### Step 7: Implement WebSocket integration in API routes

Update the timer reset API route to emit WebSocket events:

```javascript
// app/api/timer/reset/route.js
import { getTimerState, updateTimerState } from '../../../lib/timer/state';
import { emitTimerReset } from '../../../lib/websocket/events';
import { logger } from '../../../lib/logger';

export async function POST(req) {
  try {
    const { userName } = req.session;
    
    // Update timer state in database
    const result = await updateTimerState(userName);
    
    // Emit WebSocket event to notify all clients
    emitTimerReset({
      userName,
      newExpirationTime: result.currentState,
      resetTime: result.updatedAt
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      newExpirationTime: result.currentState
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    logger.error('Failed to reset timer:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to reset timer' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
```

### Step 8: Create WebSocket handling component for the dashboard

```javascript
// app/components/dashboard/TimerWebSocketHandler.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import useSocketContext from '../../hooks/useSocketContext';

export default function TimerWebSocketHandler({ onTimerReset, onTimerExpired }) {
  const router = useRouter();
  const { isConnected, subscribe } = useSocketContext();
  
  // Handle WebSocket events
  useEffect(() => {
    if (!isConnected) return;
    
    // Subscribe to timer-reset event
    const unsubscribeReset = subscribe('timer-reset', (data) => {
      console.log('Received timer-reset event:', data);
      toast.info(`Timer has been reset by ${data.resetBy}`);
      
      if (onTimerReset) {
        onTimerReset(data.newExpirationTime);
      }
    });
    
    // Subscribe to timer-expired event
    const unsubscribeExpired = subscribe('timer-expired', (data) => {
      console.log('Received timer-expired event:', data);
      toast.warning('Timer has expired!');
      
      if (onTimerExpired) {
        onTimerExpired(data);
      } else {
        // Default behavior: redirect to message test page
        router.push('/message-test');
      }
    });
    
    // Clean up subscriptions
    return () => {
      unsubscribeReset();
      unsubscribeExpired();
    };
  }, [isConnected, subscribe, onTimerReset, onTimerExpired, router]);
  
  // If not connected, optionally show a connection status
  if (!isConnected) {
    return null; // Or show a disconnected indicator
  }
  
  // This component doesn't render anything visible
  return null;
}
```

### Step 9: Create connection status indicator component

```javascript
// app/components/shared/ConnectionStatus.jsx
import { useState, useEffect } from 'react';
import useSocketContext from '../../hooks/useSocketContext';
import styles from '../../styles/modules/ConnectionStatus.module.css';

export default function ConnectionStatus() {
  const { isConnected } = useSocketContext();
  const [showStatus, setShowStatus] = useState(true);
  
  // Hide the status after 5 seconds if connected
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowStatus(true);
    }
  }, [isConnected]);
  
  // Always show if disconnected, briefly show if connected
  if (!showStatus && isConnected) {
    return null;
  }
  
  return (
    <div className={`${styles.statusContainer} ${isConnected ? styles.connected : styles.disconnected}`}>
      <div className={styles.statusIndicator} />
      <span className={styles.statusText}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
```

### Step 10: Integrate WebSockets into the Dashboard component

```javascript
// app/components/dashboard/Dashboard.jsx (updated)
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import styles from '../../styles/modules/Dashboard.module.css';
import CurrentTimeCard from './CurrentTimeCard';
import EstimatedExpirationCard from './EstimatedExpirationCard';
import TimeRemainingCard from './TimeRemainingCard';
import ResetEventsCard from './ResetEventsCard';
import TimerWebSocketHandler from './TimerWebSocketHandler';
import ConnectionStatus from '../shared/ConnectionStatus';
import { WebSocketProvider } from '../../hooks/useSocketContext';

export default function Dashboard() {
  const { data: session } = useSession();
  const [timerState, setTimerState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchTimerState = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/timer/state');
      
      if (!response.ok) {
        throw new Error('Failed to fetch timer state');
      }
      
      const data = await response.json();
      setTimerState(data);
    } catch (error) {
      console.error('Error fetching timer state:', error);
      setError('Failed to load timer information');
      toast.error('Failed to load timer information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTimerState();
    
    // Less frequent polling as a fallback (WebSockets are primary)
    const interval = setInterval(fetchTimerState, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleTimerReset = (newExpirationTime) => {
    setTimerState(prev => ({
      ...prev,
      currentState: newExpirationTime,
      resetEvents: {
        last24Hours: prev.resetEvents.last24Hours + 1,
        total: prev.resetEvents.total + 1
      }
    }));
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }
  
  return (
    <WebSocketProvider userData={session?.user}>
      <div className={styles.dashboardContainer}>
        <ConnectionStatus />
        
        {/* WebSocket event handler */}
        <TimerWebSocketHandler 
          onTimerReset={handleTimerReset}
        />
        
        <div className={styles.row}>
          <div className={styles.column}>
            <CurrentTimeCard userData={session?.user} />
          </div>
          <div className={styles.column}>
            <EstimatedExpirationCard
              expirationTime={timerState?.currentState}
              userData={session?.user}
              onReset={handleTimerReset}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.column}>
            <TimeRemainingCard
              expirationTime={timerState?.currentState}
              initialMinutes={process.env.TIMER_INITIAL_MINUTES}
            />
          </div>
          <div className={styles.column}>
            <ResetEventsCard resetEvents={timerState?.resetEvents} />
          </div>
        </div>
      </div>
    </WebSocketProvider>
  );
}
```

## Notes to Future You

1. **WebSocket Server Initialization**
   - The WebSocket server must be initialized in the custom server.js file, not in the Next.js API routes
   - Always use the path '/api/socketio' consistently between server and client configs
   - WebSocket initialization happens only once at server startup

2. **WebSocket as Notification Layer**
   - WebSockets serve as a notification mechanism, not a replacement for the database
   - Always update the database FIRST, then emit WebSocket events
   - If WebSocket emission fails, the system should still function via API polling

3. **Connection Management**
   - Implement reconnection logic with exponential backoff
   - Always show connection status indicators to users
   - Clean up WebSocket connections and subscriptions in useEffect returns

4. **Security Considerations**
   - WebSocket connections should follow the same authentication rules as API routes
   - In production, disable any event simulation endpoints
   - Validate all event payloads before processing

5. **Testing WebSocket Events**
   - Create test clients that can connect and emit events for testing
   - Test with multiple browser windows to verify synchronization
   - Ensure all event handlers properly clean up to prevent memory leaks 