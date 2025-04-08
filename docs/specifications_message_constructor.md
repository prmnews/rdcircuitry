# Message Constructor and Broadcast Specification

## 1. Introduction

This document outlines the specifications for the Message Constructor and Message Broadcast functionality, which will automatically post messages to X.com (formerly Twitter) after a specified delay when certain conditions are met.

## 2. Configuration

The system will utilize the following environment variables:

```
# X.com API Integration
TWITTER_API_KEY=xxxxxxxxxx
TWITTER_API_SECRET=xxxxxxxxxx
TWITTER_ACCESS_TOKEN=xxxxxxxxxx
TWITTER_ACCESS_SECRET=xxxxxxxxxx
TWITTER_BEARER_TOKEN=xxxxxxxxxx

# Message Control
MESSAGE_ENABLE=true/false
LAG_TIME_MINUTES=5  # Delay before message is sent
```

## 3. Components

### 3.1 Message Constructor

**Purpose**: Formats and prepares messages for posting to X.com.

**Features**:
- Messages in sprint-03 are hardcoded, a sample of 5 messages
- Only one message will be active, the others will be commented out during testing
- No message quque is required
- And no sophisticated constructor is required

**Implementation**:
- Located in `/lib/message/constructor.js`
- Exports a `constructMessage()` function

### 3.2 Message Broadcast

**Purpose**: Handles the API communication with X.com.

**Features**:
- Authenticates with X.com API using OAuth 1.0a
- Posts constructed messages after the lag timer expires
- There is only 1 message send, therefore no API rate limit logic is required
- Logs broadcast events in the database
- Implements duplicate message prevention mechanism

**Implementation**:
- Located in `/lib/message/broadcast.js`
- Exports a `broadcastMessage()` function

## 4. Workflow

1. **Trigger Condition**:
   - System timer reaches zero
   - `MESSAGE_ENABLE` environment variable is set to `true`
   - The (the Expired datetime value) + (LAG_TIME_MINUTES) must be the trigger datetime

2. **Message Construction**:
   - System constructs a message with two components:
     - Text content (hardcoded for initial implementation)
     - URL attachment (hardcoded for initial implementation)
   - Message is stored in a wait loop until the lag expires, then it will execute

3. **Lag Timer Initialization**:
   - System initiates a lag timer thread
   - This thread is instantiated when the timer reaches zero UTC
   - Timer uses `LAG_TIME_MINUTES` (default: 5 minutes) as a form of pause prior to executing
   - Timer countdown happens in a separate, isolated thread

4. **Database Logging**:
   - Event is logged in `events` collection with:
     - `eventType: 'MESSAGE_SCHEDULED'`
     - `trueDateTime: [current UTC time]`
     - `processed: false`

5. **Timer Expiration**:
   - When lag timer reaches zero, message broadcast is triggered
   - System connects to X.com API using OAuth credentials
   - Message is posted to the account
   - Event is logged in database with `eventType: 'MESSAGE_SENT'`

6. **Duplicate Message Prevention**:
   - A locking mechanism prevents multiple timers from sending duplicate messages
   - When a message is being processed, a 30-second lock is acquired
   - Subsequent message processing attempts within this window are skipped
   - Events for skipped messages are logged with `eventType: 'MESSAGE_SKIPPED'`
   - The API routes implement a cooldown period for auto-correction to prevent duplicate sends
   - This ensures that only one message is sent to X.com even if multiple timers expire in close succession

## 5. Message Format

Initial implementation will use hardcoded values:

```javascript
{
  text: "** THIS IS A TEST ** - This is an automated test message. We're working on a Hootsuite style capability for low volume news. #automation #testing",
  url: "https://christinprophecy.org/articles/why-i-believe-in-a-pre-tribulation-rapture/"
}
```

The URL will be appended to the message text when sent to X.com.

## 6. Lag Timer Implementation

The lag timer will be implemented using:

1. **Node.js `setTimeout()`**:
   ```javascript
   setTimeout(() => {
     broadcastMessage(message);
   }, LAG_TIME_MINUTES * 60 * 1000);
   ```

2. **Progress Tracking**:
   - Internal counter to track remaining time
   - We do not require an API endpoint for checking timer status

3. **Persistence**:
   - Timer state will be persisted in the database
   - Important requirement: System can recover and continue timer in case of restart

## 7. Error Handling

1. **API Connection Failures**:
   - Implement exponential backoff retry (3 attempts)
   - Log failures to database
   - Surface errors to admin dashboard

2. **Rate Limiting**:
   - No rate limiting is required...we can't justify the development spent given our low volume.

3. **Message Validation**:
   - Verify message meets X.com requirements before sending
   - Character count validation (280 character limit)
   - Media attachment validation

4. **Duplicate Prevention**:
   - Locking mechanism to prevent duplicate sends during concurrent processing
   - Cooldown periods for auto-correction logic in API routes
   - Logging of skipped messages for audit purposes
   - Automatic release of locks after a specified timeout period

