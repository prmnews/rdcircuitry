import mongoose, { Schema, Document, Model } from 'mongoose';

// Key types enum
export enum KeyType {
  READ_ONLY = 'read-only',
  ADMIN = 'admin',
  SERVICE = 'service'
}

// Key status enum
export enum KeyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

// Audit trail interface
export interface IAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details?: string;
}

// API Key document interface
export interface IApiKey extends Document {
  apiKey: string;
  userName: string;  // Reference to User.userName
  apiStart: Date;
  apiExpireDateTime: Date;
  isRevoked: boolean;
  lastUsed?: Date;
  usageCount: number;
  description?: string;
  
  // Key rotation fields
  previousKey?: string;
  keyRotationDate?: Date;
  keyRotationReason?: string;
  
  // Audit trail
  createdBy: string;
  lastModifiedBy?: string;
  modificationHistory: IAuditEntry[];
  
  // Key metadata
  keyType: KeyType;
  allowedIPs?: string[];
  allowedOrigins?: string[];
  
  // Key lifecycle
  status: KeyStatus;
  suspensionReason?: string;
  suspensionDate?: Date;
  
  // Helper methods
  isExpired(): boolean;
  isValid(): boolean;
  incrementUsage(): Promise<void>;
  validateUser(): Promise<boolean>;
  rotate(newKey: string, reason: string, performedBy: string): Promise<void>;
  suspend(reason: string, performedBy: string): Promise<void>;
  revoke(reason: string, performedBy: string): Promise<void>;
  reactivate(performedBy: string): Promise<void>;
  addAuditEntry(action: string, performedBy: string, details?: string): Promise<void>;
}

// Create ApiKey schema
const ApiKeySchema = new Schema<IApiKey>({
  apiKey: {
    type: String,
    required: true,
    index: { unique: true }
  },
  userName: {
    type: String,
    required: true,
    index: true,
    ref: 'User',
    validate: {
      validator: async function(userName: string) {
        const User = mongoose.model('User');
        const user = await User.findOne({ userName });
        return user !== null;
      },
      message: 'User does not exist'
    }
  },
  apiStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  apiExpireDateTime: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    required: true,
    default: false
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String
  },
  
  // Key rotation fields
  previousKey: {
    type: String
  },
  keyRotationDate: {
    type: Date
  },
  keyRotationReason: {
    type: String
  },
  
  // Audit trail
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String
  },
  modificationHistory: [{
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    details: String
  }],
  
  // Key metadata
  keyType: {
    type: String,
    enum: Object.values(KeyType),
    required: true,
    default: KeyType.READ_ONLY
  },
  allowedIPs: [{
    type: String
  }],
  allowedOrigins: [{
    type: String
  }],
  
  // Key lifecycle
  status: {
    type: String,
    enum: Object.values(KeyStatus),
    required: true,
    default: KeyStatus.ACTIVE
  },
  suspensionReason: {
    type: String
  },
  suspensionDate: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'apiKeys'
});

// Indexes for efficient queries
ApiKeySchema.index({ userName: 1, isRevoked: 1 });
ApiKeySchema.index({ apiExpireDateTime: 1 });
ApiKeySchema.index({ status: 1 });
ApiKeySchema.index({ keyType: 1 });

// Helper method to check if key is expired
ApiKeySchema.methods.isExpired = function(): boolean {
  return this.apiExpireDateTime < new Date();
};

// Helper method to check if key is valid
ApiKeySchema.methods.isValid = function(): boolean {
  return !this.isRevoked && !this.isExpired() && this.status === KeyStatus.ACTIVE;
};

// Helper method to increment usage
ApiKeySchema.methods.incrementUsage = async function(): Promise<void> {
  this.lastUsed = new Date();
  this.usageCount += 1;
  await this.save();
};

// Helper method to validate user exists
ApiKeySchema.methods.validateUser = async function(): Promise<boolean> {
  const User = mongoose.model('User');
  const user = await User.findOne({ userName: this.userName });
  return user !== null;
};

// Helper method to rotate key
ApiKeySchema.methods.rotate = async function(newKey: string, reason: string, performedBy: string): Promise<void> {
  this.previousKey = this.apiKey;
  this.apiKey = newKey;
  this.keyRotationDate = new Date();
  this.keyRotationReason = reason;
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_ROTATION', performedBy, reason);
  await this.save();
};

// Helper method to suspend key
ApiKeySchema.methods.suspend = async function(reason: string, performedBy: string): Promise<void> {
  this.status = KeyStatus.SUSPENDED;
  this.suspensionReason = reason;
  this.suspensionDate = new Date();
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_SUSPENSION', performedBy, reason);
  await this.save();
};

// Helper method to revoke key
ApiKeySchema.methods.revoke = async function(reason: string, performedBy: string): Promise<void> {
  this.status = KeyStatus.REVOKED;
  this.isRevoked = true;
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_REVOCATION', performedBy, reason);
  await this.save();
};

// Helper method to reactivate key
ApiKeySchema.methods.reactivate = async function(performedBy: string): Promise<void> {
  this.status = KeyStatus.ACTIVE;
  this.suspensionReason = undefined;
  this.suspensionDate = undefined;
  this.lastModifiedBy = performedBy;
  await this.addAuditEntry('KEY_REACTIVATION', performedBy);
  await this.save();
};

// Helper method to add audit entry
ApiKeySchema.methods.addAuditEntry = async function(action: string, performedBy: string, details?: string): Promise<void> {
  this.modificationHistory.push({
    timestamp: new Date(),
    action,
    performedBy,
    details
  });
};

// Create the model
export interface IApiKeyModel extends Model<IApiKey> {}

const ApiKey = mongoose.model<IApiKey, IApiKeyModel>('ApiKey', ApiKeySchema);

export default ApiKey; 