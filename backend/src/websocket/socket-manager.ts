import { Server, Socket } from 'socket.io';

/**
 * WebSocket events enum
 */
export enum SocketEvents {
  // Client events
  CLIENT_CONNECTED = 'client:connected',
  CLIENT_DISCONNECTED = 'client:disconnected',
  
  // Timer events
  TIMER_START = 'timer:start',
  TIMER_STOP = 'timer:stop',
  TIMER_RESET = 'timer:reset',
  TIMER_UPDATE = 'timer:update',
  TIMER_EXPIRED = 'timer:expired',
  
  // Notification events
  NOTIFICATION = 'notification',
  
  // Error events
  ERROR = 'error',
}

/**
 * WebSocket manager for handling socket.io events
 */
export class SocketManager {
  private io: Server;
  private adminConnections: Set<string> = new Set();
  private userConnections: Map<string, string> = new Map(); // socketId -> userId

  constructor(io: Server) {
    this.io = io;
    this.setupConnectionHandlers();
  }

  /**
   * Set up connection and event handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Handle authentication
      socket.on('authenticate', (data: { userId: string; isAdmin?: boolean }) => {
        if (data.userId) {
          this.userConnections.set(socket.id, data.userId);
          
          if (data.isAdmin) {
            this.adminConnections.add(socket.id);
          }
          
          // Inform the client they're authenticated
          socket.emit(SocketEvents.CLIENT_CONNECTED, { 
            success: true,
            socketId: socket.id
          });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.userConnections.delete(socket.id);
        this.adminConnections.delete(socket.id);
      });
      
      // Timer events
      this.setupTimerEvents(socket);
    });
  }

  /**
   * Set up timer-related events
   */
  private setupTimerEvents(socket: Socket): void {
    // Start timer event (admin only)
    socket.on(SocketEvents.TIMER_START, (data: { minutes: number }) => {
      if (this.isAdmin(socket.id)) {
        console.log(`Timer started with ${data.minutes} minutes`);
        this.io.emit(SocketEvents.TIMER_START, { minutes: data.minutes, startTime: new Date() });
      } else {
        socket.emit(SocketEvents.ERROR, { message: 'Unauthorized: Admin access required' });
      }
    });
    
    // Stop timer event (admin only)
    socket.on(SocketEvents.TIMER_STOP, () => {
      if (this.isAdmin(socket.id)) {
        console.log('Timer stopped');
        this.io.emit(SocketEvents.TIMER_STOP, { stopTime: new Date() });
      } else {
        socket.emit(SocketEvents.ERROR, { message: 'Unauthorized: Admin access required' });
      }
    });
    
    // Reset timer event (admin only)
    socket.on(SocketEvents.TIMER_RESET, () => {
      if (this.isAdmin(socket.id)) {
        console.log('Timer reset');
        this.io.emit(SocketEvents.TIMER_RESET, { resetTime: new Date() });
      } else {
        socket.emit(SocketEvents.ERROR, { message: 'Unauthorized: Admin access required' });
      }
    });
  }

  /**
   * Check if the socket is an admin
   */
  private isAdmin(socketId: string): boolean {
    return this.adminConnections.has(socketId);
  }

  /**
   * Send a notification to all connected clients
   */
  public sendNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit(SocketEvents.NOTIFICATION, { message, type, timestamp: new Date() });
  }

  /**
   * Send a notification to a specific user
   */
  public sendNotificationToUser(userId: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const socketIds = Array.from(this.userConnections.entries())
      .filter(([_, id]) => id === userId)
      .map(([socketId, _]) => socketId);
    
    socketIds.forEach(socketId => {
      this.io.to(socketId).emit(SocketEvents.NOTIFICATION, { message, type, timestamp: new Date() });
    });
  }

  /**
   * Emit timer reset event to all connected clients
   */
  public emitTimerReset(data: { 
    resetBy: string; 
    newExpirationTime: string; 
    resetTime: string; 
    reason?: string;
    remainder?: number;
  }): void {
    this.io.emit(SocketEvents.TIMER_RESET, data);
    console.log(`Timer reset event emitted by ${data.resetBy}`);
  }
} 