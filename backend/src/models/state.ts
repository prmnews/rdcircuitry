import mongoose from 'mongoose';
import { IState, IStateModel } from '../types/models';

const StateSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: 'timer_state',
    required: true 
  },
  currentState: { 
    type: Date, 
    required: true 
  },
  isRDI: { 
    type: Boolean, 
    default: false 
  },
  resetEvents: {
    last24Hours: { 
      type: Number, 
      default: 0 
    },
    total: { 
      type: Number, 
      default: 0 
    }
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Add static methods
StateSchema.statics.getCurrentState = async function(): Promise<IState | null> {
  console.log('📊 Getting current timer state from database');
  const state = await this.findOne({ _id: 'timer_state' });
  if (!state) {
    console.log('⚠️ No timer state found in database');
    return null;
  }
  console.log(`✅ Current timer state retrieved: ${state.currentState}`);
  return state;
};

StateSchema.statics.isExpired = function(state: IState | null): boolean {
  if (!state || !state.currentState) {
    console.log('⚠️ Cannot check expiration: no valid state provided');
    return false;
  }
  
  const now = new Date();
  const targetTime = new Date(state.currentState);
  const isExpired = now >= targetTime;
  
  console.log(`🕒 Timer expiration check: ${isExpired ? 'EXPIRED' : 'ACTIVE'}`);
  console.log(`   Current time: ${now.toISOString()}`);
  console.log(`   Target time: ${targetTime.toISOString()}`);
  
  return isExpired;
};

const State = mongoose.model<IState, IStateModel>('State', StateSchema);

export default State; 