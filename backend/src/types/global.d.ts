import { Connection, Mongoose } from 'mongoose';
import { Server } from 'socket.io';
import { SocketManager } from '../websocket/socket-manager';
import mongoose from 'mongoose';

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

  namespace Express {
    interface User {
      _id: string;
      userName: string;
      role: string;
    }
  }

  interface UserDocument extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    userName: string;
    role: string;
    location?: any;
  }

  interface EventDocument extends mongoose.Document {
    details: string | any;
    userName: string;
    eventType: string;
    trueDateTime: Date;
  }
}

// Export empty object to make this a module
export {}; 