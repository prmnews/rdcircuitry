import mongoose from 'mongoose';
import { ICountry } from '../types/models';

const CountrySchema = new mongoose.Schema({
  countryCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  countryName: { 
    type: String, 
    required: true 
  },
  metadata: [{
    timeZone: { 
      type: String, 
      required: true 
    },
    gmtOffset: { 
      type: String, 
      required: true 
    }
  }]
});

// Log country operations
CountrySchema.pre('save', function() {
  console.log(`🌍 Saving country: ${this.countryName} (${this.countryCode})`);
});

CountrySchema.post('save', function() {
  console.log(`✅ Country saved: ${this.countryName} with ${this.metadata.length} timezone(s)`);
});

const Country = mongoose.model<ICountry>('Country', CountrySchema);

export default Country; 