/**
 * Type definitions for the message broadcast module
 */

export interface MessageContent {
  text: string;
  url?: string;
}

export interface BroadcastResult {
  success: boolean;
  tweetId?: string;
  error?: string;
  createdAt: Date;
  mock?: boolean;
}

export function broadcastMessage(message: MessageContent): Promise<BroadcastResult>; 