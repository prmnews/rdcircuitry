import { Socket as SocketIOClient } from 'socket.io-client';
import {
  TimerResetEvent,
  TimerExpiredEvent,
  MessageTimerStartedEvent,
  MessageTimerExpiredEvent
} from '@/types';

declare module 'socket.io-client' {
  interface Socket extends SocketIOClient {
    on(event: 'timer-reset', listener: (data: TimerResetEvent) => void): this;
    on(event: 'timer-expired', listener: (data: TimerExpiredEvent) => void): this;
    on(event: 'message-timer-started', listener: (data: MessageTimerStartedEvent) => void): this;
    on(event: 'message-timer-expired', listener: (data: MessageTimerExpiredEvent) => void): this;
    
    emit(event: 'timer-reset', data: TimerResetEvent): this;
    emit(event: 'timer-expired', data: TimerExpiredEvent): this;
    emit(event: 'message-timer-started', data: MessageTimerStartedEvent): this;
    emit(event: 'message-timer-expired', data: MessageTimerExpiredEvent): this;
  }
} 