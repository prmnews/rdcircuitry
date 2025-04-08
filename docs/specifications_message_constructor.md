# Message Constructor and Broadcast Specification

## Purpose

Think of this like the product called Hootsuite!
I don't need a solution that scaled anymore, but I do want to have some deployment automation

## 1. Introduction

When the /dashboard/ endpoint hits a expired timer, and after the 5-second grace period, it should redirect to the /message/ endpoint. This document outlines the specifications for the Message Constructor and Message Broadcast functionality, which will automatically post one or more messages to X.com (formerly Twitter) after a specified lag delay.

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

## 3. User Interface

**Design**: The UI is here: /backend/src/docs/Message Broadcast Status.png
**Shadcn**" 
  - This is a shadcn card
  - The title is Message Broadcast Status
  - The Trigger Time: displays the calculated trigger time 
  - The Time Remaining: is a countdown timer that stops at zero
  - The Message Content: is the {messagetimers} singleton document
  - There is a Back to Dashboard link:
    - If the Timer is > zero then it is enabled, but
    - If the Time Remaining is zero, it is disabled.

## 4. Components

### 4.1 Message Constructor

**Purpose**: Formats and prepares messages for posting to X.com.

**Features**:
- Messages are hardcoded during testing. There should be 5 messages in the collection. 
- A randomized INT will select which of the message to emit to x.com
- Only one message will be sent, the others will be passively retained during testing
- No message quque is required
- And no sophisticated constructor is required because the message has text + url. very easy!

**Implementation**:
- Located in `/lib/message/constructor.js`
- Exports a `constructMessage()` function

### 4.2 Message Broadcast

**Purpose**: Handles the API communication with X.com to post the message using the API keys.

**Features**:
- Authenticates with X.com API using OAuth 1.0a
- Posts constructed messages after the lag timer expires (lag timer is similar to a grace period)
- There is only 1 message sent, therefore no API rate limit logic is required
- Logs broadcast events in the database in {events}.messageType, which contains:
      'MESSAGE_SCHEDULED',
      'MESSAGE_SENDING',
      'MESSAGE_SENT',
      'MESSAGE_FAILED'

**Implementation**:
- Located in `/lib/message/broadcast.js`
- Exports a `broadcastMessage()` function

## 5. Workflow

1. **Trigger Condition**:
   - If the system timer from /Dashboard/ reaches zero after the 5-second toast grace period
   - `MESSAGE_ENABLE` environment variable is set to `true`
   - The (the Expired datetime value) + (LAG_TIME_MINUTES) must be the trigger datetime
     - For example: assume the Expired Time is 10:15:00pm UTC
     - The LAG_TIME_MINUTES is 1 minute
     - Therefore, the LAG TIMER maintained by the /message/ endpoint is 10:16:00pm UTC
   - If the LAG timer expires (there is no further grace period) it will
     - call the message constructor, then
     - post the x.com post via the API

2. **Message Construction**:
   - Messages are stored in a json file (see below)
   - System constructs a message with two components:
     - Text content (hardcoded for initial implementation)
     - URL attachment (hardcoded for initial implementation)
   - Message is stored in a singleton document in the {messagetimers} collection
     - As messages are randomly picked from the json file, we must updateOne in the {messagetimers} document

3. **Lag Timer Initialization**:
   - System initiates a lag timer thread once the /message/ endpoint is activated
   - This thread is instantiated when the /dashboard/ timer reaches zero UTC (i.e. it is expired)
   - Timer uses `LAG_TIME_MINUTES` (fallback: 5 minutes) as a form of pause prior to executing
   - Timer countdown happens in a separate, isolated thread
   - The /dashboard/ timer is not longer active

4. **Database Logging**:
   - Event is logged in `events` collection with:
     - `eventType: 'MESSAGE_SCHEDULED'`
     - `trueDateTime: [current UTC time]`
     - `processed: false`

5. **Timer Expiration**:
   - When lag timer reaches zero, message broadcast is triggered
   - System connects to X.com API using OAuth credentials
   - Message from {messagetimers} is posted to the account
   - Event is logged in database with `eventType: 'MESSAGE_SENT'`

## 6. Message Format

Initial implementation will use a small number of sample posts:

location: /backend/src/data/messages.json

```javascript
[
    {
        "sequence": 1,
        "category": "ai",
        "message": "** TEST MESSAGE {sequence * rnd(7, 12)} ** - This is an automated test message sent at {timestamp} UTC. We're working on a Hootsuite style capability for low volume news. #automation #testing",
        "url": "https://docs.anthropic.com/en/docs/agents-and-tools/mcp"
    },
    {
        "sequence": 2,
        "category": "economics",
        "message": "** TEST MESSAGE {sequence * rnd(7, 12)} ** - This is an automated test message sent at {timestamp} UTC. We're working on a Hootsuite style capability for low volume news. #automation #testing",
        "url": "https://www.scmp.com/economy/global-economy/article/3305666/brace-impact-chinese-economist-warns-gloves-are-us-trade-war?module=top_story&pgtype=section"
    },
    {
        "sequence": 3,
        "category": "quantum",
        "message": "** TEST MESSAGE {sequence * rnd(7, 12)} ** - This is an automated test message sent at {timestamp} UTC. We're working on a Hootsuite style capability for low volume news. #automation #testing",
        "url": "https://blog.google/technology/research/google-willow-quantum-chip/"
    },
    {
        "sequence": 4,
        "category": "development",
        "message": "** TEST MESSAGE {sequence * rnd(7, 12)} ** - This is an automated test message sent at {timestamp} UTC. We're working on a Hootsuite style capability for low volume news. #automation #testing",
        "url": "https://www.cursor.com/features"
    },
    {
        "sequence": 5,
        "category": "earthquakes",
        "message": "** TEST MESSAGE {sequence * rnd(7, 12)} ** - This is an automated test message sent at {timestamp} UTC. We're working on a Hootsuite style capability for low volume news. #automation #testing",
        "url": "https://earthquake.usgs.gov/earthquakes/map/"
    }
]
```

The URL will be appended to the message text when sent to X.com
