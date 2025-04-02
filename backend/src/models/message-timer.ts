import mongoose from 'mongoose';
import { IMessageTimer, IMessageTimerModel, IMessageTimerData } from '../types/models';

const MessageTimerSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: 'message_timer',
    required: true
  },
  triggerTime: { 
    type: Date, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  messageContent: {
    text: { 
      type: String, 
      required: true 
    },
    url: { 
      type: String 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Add static methods
MessageTimerSchema.statics.getActiveTimer = async function(): Promise<IMessageTimer | null> {
  console.log('📊 Checking for active message timer');
  const timer = await this.findOne({ 
    _id: 'message_timer', 
    active: true 
  });
  
  if (timer) {
    console.log(`✅ Active message timer found, trigger time: ${timer.triggerTime}`);
  } else {
    console.log('ℹ️ No active message timer found');
  }
  
  return timer;
};

MessageTimerSchema.statics.deactivateTimer = async function(): Promise<any> {
  console.log('🛑 Deactivating message timer');
  const result = await this.updateOne(
    { _id: 'message_timer' },
    { $set: { active: false, updatedAt: new Date() } }
  );
  
  console.log(`✅ Message timer deactivated (${result.modifiedCount} document updated)`);
  return result;
};

MessageTimerSchema.statics.createTimer = async function(data: IMessageTimerData): Promise<IMessageTimer | null> {
  console.log(`⏰ Creating/updating message timer with trigger time: ${data.triggerTime}`);
  console.log(`📝 Message content: ${data.messageContent.text.substring(0, 50)}${data.messageContent.text.length > 50 ? '...' : ''}`);
  
  const timer = await this.findOneAndUpdate(
    { _id: 'message_timer' },
    { 
      $set: {
        triggerTime: data.triggerTime,
        active: true,
        messageContent: data.messageContent,
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Message timer ${timer ? 'created/updated successfully' : 'operation failed'}`);
  return timer;
};

const MessageTimer = mongoose.model<IMessageTimer, IMessageTimerModel>('MessageTimer', MessageTimerSchema);

export default MessageTimer; 