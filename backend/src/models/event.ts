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

EventSchema.statics.logTimerReset = async function(data: IEventData): Promise<IEvent> {
  console.log(`📝 Logging timer reset event for user: ${data.userName}`);
  console.log(`   Location: ${data.location.countryName} (${data.location.countryCode})`);
  
  const event = await this.create({
    userName: data.userName || 'system',
    isUserValidation: true,
    eventType: 'TIMER_RESET',
    location: data.location || { countryCode: 'US', countryName: 'United States' },
    trueDateTime: new Date(),
    remainder: data.remainder || null,
    processed: true,
    details: data.details ? JSON.stringify(data.details) : null
  });
  
  console.log(`✅ Timer reset event logged successfully with ID: ${event._id}`);
  return event;
};

const Event = mongoose.model<IEvent, IEventModel>('Event', EventSchema);

export default Event; 