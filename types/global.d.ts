import { Connection, Mongoose } from 'mongoose';

declare global {
  var mongoose: {
    conn: Connection | null;
    promise: Promise<Mongoose> | null;
  };
  
  interface Window {
    socketIo: any;
  }
}

// Export empty object to make this a module
export {}; 