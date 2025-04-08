import { Connection, Mongoose } from 'mongoose';
import { Server } from 'socket.io';
import { SocketManager } from '../websocket/socket-manager';

declare global {
  var mongoose: {
    conn: Connection | null;
    promise: Promise<Mongoose> | null;
  };
  
  var socketIo: Server;
  var socketManager: SocketManager;
  
  interface Window {
    socketIo: any;
  }
}

// Export empty object to make this a module
export {}; 