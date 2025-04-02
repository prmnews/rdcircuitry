import mongoose from 'mongoose';
import { DB_CONFIG } from '../config';

// Define connection cache types
interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global connection cache
let cached: ConnectionCache = { conn: null, promise: null };

export async function connectToDatabase(): Promise<typeof mongoose> {
  // If connection exists, reuse it
  if (cached.conn) {
    return cached.conn;
  }

  if (!DB_CONFIG.MONGODB_URI) {
    throw new Error('MONGODB_URI not defined in environment variables');
  }

  // If a connection is already being established, wait for it
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: DB_CONFIG.MONGODB_DB
    };

    cached.promise = mongoose.connect(DB_CONFIG.MONGODB_URI, opts)
      .then((mongoose) => {
        console.log(`✅ Connected to MongoDB database: ${DB_CONFIG.MONGODB_DB}`);
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
} 