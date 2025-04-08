# State Manager Service Specifications

## Introduction
The State Manager is a dedicated Node.js service that monitors the timer state, handles RDI (Reset Detection Indicator) transitions, and manages message construction and delivery. This service operates independently from the main Next.js application while sharing the same MongoDB database.

## Core Responsibilities
1. **State Monitoring**
   - Watch the {state} collection for changes
   - Calculate and update RDI status based on LAG_TIME_MINUTES
   - Reconcile state after service interruptions
   - Maintain audit log of state transitions

2. **Message Management**
   - Construct messages when RDI transitions to true
   - Handle message queue persistence
   - Manage Twitter API rate limiting
   - Provide retry logic for failed messages

## Technical Architecture

### Service Components
```typescript
interface StateManager {
  stateMonitor: StateMonitor;
  messageQueue: MessageQueue;
  reconciliation: StateReconciliation;
}

interface StateMonitor {
  currentState: State;
  changeStream: ChangeStream;
  lastCheck: Date;
}

interface MessageQueue {
  pendingMessages: Message[];
  processedMessages: Message[];
  failedMessages: Message[];
}

interface StateReconciliation {
  lastReconciliation: Date;
  reconciliationLog: ReconciliationEvent[];
}
```

### Database Collections
Extends existing collections with new fields:

1. **{state} collection** (existing)
   ```javascript
   {
     _id: "timer_state",
     currentState: Date,
     isRDI: Boolean,
     stateManager: {
       lastCheck: Date,
       lastReconciliation: Date,
       serviceVersion: String
     }
   }
   ```

2. **{messages} collection** (new)
   ```javascript
   {
     _id: ObjectId(),
     eventId: String,
     content: String,
     status: 'pending' | 'processing' | 'completed' | 'failed',
     attempts: Number,
     lastAttempt: Date,
     error: String,
     createdAt: Date,
     processedAt: Date
   }
   ```

## Core Workflows

### 1. Startup Procedure
```typescript
async function startupProcedure() {
  // 1. Initialize database connection
  // 2. Perform state reconciliation
  // 3. Process any pending messages
  // 4. Start change stream monitoring
  // 5. Initialize health check endpoint
}
```

### 2. State Monitoring
```typescript
async function monitorState() {
  // 1. Watch for state changes
  // 2. Calculate RDI status
  // 3. Update state if needed
  // 4. Trigger message construction if RDI transitions to true
}
```

### 3. Message Handling
```typescript
async function handleMessage() {
  // 1. Construct message
  // 2. Add to queue
  // 3. Process with rate limiting
  // 4. Handle retries
  // 5. Update message status
}
```

### 4. Recovery Procedures
```typescript
async function handleRecovery() {
  // 1. Check last known state
  // 2. Calculate expected state
  // 3. Reconcile differences
  // 4. Log recovery actions
}
```

## Environment Variables
```bash
# Service Configuration
STATE_MANAGER_VERSION=1.0.0
STATE_MANAGER_PORT=3001
STATE_MANAGER_LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://...
MONGODB_DB_NAME=rdi

# Twitter API
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx

# Business Logic
LAG_TIME_MINUTES=120
MESSAGE_RETRY_ATTEMPTS=3
MESSAGE_RETRY_DELAY=300000  # 5 minutes in milliseconds
```

## Health Monitoring
- Endpoint: `/health`
- Metrics: `/metrics`
- Status dashboard for monitoring service health
- Alert configuration for critical failures

## Error Handling
1. **Database Errors**
   - Connection retry logic
   - Failover procedures
   - Error logging and alerting

2. **Message Delivery Failures**
   - Retry with exponential backoff
   - Dead letter queue for failed messages
   - Alert on repeated failures

3. **State Inconsistencies**
   - Automatic reconciliation attempts
   - Manual override procedures
   - Audit logging of all corrections

## Deployment
- Node.js service on Replit
- PM2 process management
- Automatic restart on failure
- Log rotation and management

## Monitoring and Logging
1. **Metrics to Track**
   - State check frequency
   - RDI transition counts
   - Message success/failure rates
   - Recovery event frequency
   - API rate limit status

2. **Logging**
   - Structured JSON logging
   - Log levels (debug, info, warn, error)
   - Separate logs for:
     - State changes
     - Message processing
     - Error conditions
     - Recovery actions

## Future Considerations
1. **Scalability**
   - Multiple instance support
   - Load balancing considerations
   - Database connection pooling

2. **Additional Features**
   - Admin API for manual controls
   - Extended monitoring capabilities
   - Additional message platforms
   - Webhook notifications

## Testing Requirements
1. **Unit Tests**
   - State calculation logic
   - Message construction
   - Recovery procedures

2. **Integration Tests**
   - Database operations
   - Message delivery
   - API rate limiting

3. **End-to-End Tests**
   - Complete workflow testing
   - Failure scenario testing
   - Recovery testing

## Documentation Requirements
1. **Setup Guide**
   - Installation steps
   - Configuration details
   - Deployment procedures

2. **Operations Manual**
   - Monitoring procedures
   - Troubleshooting guides
   - Recovery procedures

3. **API Documentation**
   - Health check endpoints
   - Admin controls
   - Metrics endpoints 