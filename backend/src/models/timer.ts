import mongoose, { Document, Schema } from 'mongoose';

// Timer states
export enum TimerState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  EXPIRED = 'expired'
}

// Timer document interface
export interface ITimer extends Document {
  name: string;
  durationMinutes: number;
  startTime?: Date;
  endTime?: Date;
  pausedAt?: Date;
  totalPausedMs: number;
  state: TimerState;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Timer schema
const TimerSchema = new Schema<ITimer>(
  {
    name: {
      type: String,
      required: [true, 'Timer name is required'],
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [0.1, 'Duration must be at least 0.1 minutes'],
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    pausedAt: {
      type: Date,
    },
    totalPausedMs: {
      type: Number,
      default: 0,
    },
    state: {
      type: String,
      enum: Object.values(TimerState),
      default: TimerState.IDLE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  { timestamps: true }
);

// Create and export Timer model
export const Timer = mongoose.models.Timer || mongoose.model<ITimer>('Timer', TimerSchema); 