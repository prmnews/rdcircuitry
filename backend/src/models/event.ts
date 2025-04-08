import mongoose from 'mongoose';
import { IEvent, IEventModel, IEventData, EventType } from '../types/models';

const EventSchema = new mongoose.Schema({
  userName: { 
    type: String, 
    required: true,
    index: true
  },
  isUserValidation: { 
    type: Boolean, 
    default: false 
  },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'LOGIN', 
      'TIMER_RESET', 
      'TIMER_EXPIRED', 
      'MESSAGE_SCHEDULED',
      'MESSAGE_SENDING',
      'MESSAGE_SENT',
      'MESSAGE_FAILED'
    ] as EventType[],
    index: true
  },
  location: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  trueDateTime: { 
    type: Date, 
    required: true,
    index: true
  },
  localDateTime: {
    type: Date,
    default: null
  },
  remainder: { 
    type: Number,
    default: null
  },
  processed: { 
    type: Boolean, 
    default: false,
    index: true
  },
  details: { 
    type: String 
  }
}, { 
  timestamps: true 
});

// Static methods
EventSchema.statics.getRecentResets = async function(hours: number = 24): Promise<number> {
  console.log(`🔍 Checking reset events in the last ${hours} hours`);
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  
  const count = await this.countDocuments({
    eventType: 'TIMER_RESET',
    trueDateTime: { $gte: cutoff }
  });
  
  console.log(`📊 Found ${count} reset events in the last ${hours} hours`);
  return count;
};

/**
 * Log a timer reset event
 */
EventSchema.statics.logTimerReset = async function(data: IEventData): Promise<IEvent> {
  const { userName, location, remainder, details } = data;
  
  // Ensure remainder is included in details
  const eventDetails = {
    ...details,
    remainder: remainder !== undefined ? remainder : 0 // Make sure remainder is set even if undefined
  };
  
  const now = new Date();
  
  // Create event document
  const event = new this({
    userName,
    eventType: 'TIMER_RESET',
    trueDateTime: now,
    localDateTime: now, // Will be adjusted if location provided
    location,
    details: JSON.stringify(eventDetails)
  });
  
  // If location is provided, adjust local time
  if (location && location.gmtOffset) {
    // Parse GMT offset (could be string like '+540' or '-480')
    const offsetMinutes = parseInt(location.gmtOffset, 10);
    
    // Create a date object adjusted for the user's timezone
    // UTC + gmtOffset (in minutes)
    const localTime = new Date(now.getTime() + (offsetMinutes * 60 * 1000));
    event.localDateTime = localTime;
  }
  
  // Save and return the event
  return await event.save();
};

const Event = mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event; 