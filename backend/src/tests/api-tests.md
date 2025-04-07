# RD Circuitry API Testing Guide

This document provides testing instructions for the backend API routes using Postman. These tests will help verify that the API endpoints are functioning correctly.

## Environment Setup

Create a Postman environment with the following variables:

- `baseUrl`: `http://localhost:3000` (or your backend server URL)
- `token`: (This will be populated after login)

## Authentication Tests

### Test: User Login

- **API Route**: `{{baseUrl}}/api/auth/login`
- **Purpose**: Authenticate a user and obtain a JWT token
- **Structure**: POST request
- **Request Body**:
  ```json
  {
    "userName": "admin",
    "pinNumber": "admin123"
  }
  ```
- **Tests to Add**:
  ```javascript
  // Test successful response
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Response contains token", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.token).to.exist;
    
    // Save token to environment
    if (jsonData.token) {
      pm.environment.set("token", jsonData.token);
    }
  });

  pm.test("Response contains user data", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.user).to.exist;
    pm.expect(jsonData.user.userName).to.equal("admin");
    pm.expect(jsonData.user.role).to.equal("admin");
  });
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "userName": "admin",
      "location": {
        "countryCode": "US",
        "countryName": "United States",
        "timeZone": "America/New_York",
        "gmtOffset": "-05:00"
      },
      "role": "admin",
      "lastLogin": "2023-04-05T18:30:00.000Z"
    }
  }
  ```

### Test: Failed User Login

- **API Route**: `{{baseUrl}}/api/auth/login`
- **Purpose**: Verify authentication fails with incorrect credentials
- **Structure**: POST request
- **Request Body**:
  ```json
  {
    "userName": "admin",
    "pinNumber": "wrongpin"
  }
  ```
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 401", function() {
    pm.response.to.have.status(401);
  });

  pm.test("Response has success flag set to false", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
  });

  pm.test("Response contains error message", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.message).to.exist;
  });
  ```
- **Expected Response**:
  ```json
  {
    "success": false,
    "message": "Invalid credentials"
  }
  ```

### Test: Get Current User

- **API Route**: `{{baseUrl}}/api/auth/me`
- **Purpose**: Retrieve current user information using JWT token
- **Structure**: GET request
- **Headers**:
  - `x-auth-token`: `{{token}}`
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Response contains user data", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.user).to.exist;
    pm.expect(jsonData.user.userName).to.equal("admin");
    pm.expect(jsonData.user.role).to.equal("admin");
  });
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "...",
      "userName": "admin",
      "location": {
        "countryCode": "US",
        "countryName": "United States",
        "timeZone": "America/New_York",
        "gmtOffset": "-05:00"
      },
      "role": "admin",
      "lastLogin": "2023-04-05T18:30:00.000Z"
    }
  }
  ```

## Timer API Tests

### Test: Check Timer Expiry (Not Expired)

- **API Route**: `{{baseUrl}}/api/timer/check-expiry`
- **Purpose**: Check if the timer has expired when it's still active
- **Structure**: GET request
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Timer is not expired", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.isExpired).to.be.false;
    pm.expect(jsonData.remainingTime).to.be.greaterThan(0);
  });

  pm.test("Response contains correct time data", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.targetTime).to.exist;
    pm.expect(jsonData.now).to.exist;
    pm.expect(new Date(jsonData.targetTime).getTime()).to.be.greaterThan(new Date(jsonData.now).getTime());
  });
  ```
- **Expected Response** (when timer is not expired):
  ```json
  {
    "success": true,
    "isExpired": false,
    "isRDI": false,
    "remainingTime": 120000,
    "targetTime": "2023-04-05T19:30:00.000Z",
    "now": "2023-04-05T19:28:00.000Z"
  }
  ```

### Test: Check Timer Expiry (Expired)

- **API Route**: `{{baseUrl}}/api/timer/check-expiry`
- **Purpose**: Check if the timer has expired when it is expired
- **Structure**: GET request
- **Note**: You may need to wait for the timer to expire or use the update-state.ts script to set a past expiration time
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Timer is expired", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.isExpired).to.be.true;
  });

  pm.test("Response contains timer state data", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.targetTime).to.exist;
    pm.expect(jsonData.now).to.exist;
    pm.expect(new Date(jsonData.targetTime).getTime()).to.be.lessThan(new Date(jsonData.now).getTime());
  });
  ```
- **Expected Response** (when timer is expired):
  ```json
  {
    "success": true,
    "isExpired": true,
    "isRDI": false,
    "targetTime": "2023-04-05T19:28:00.000Z",
    "now": "2023-04-05T19:30:00.000Z"
  }
  ```

### Test: Reset Timer

- **API Route**: `{{baseUrl}}/api/timer/reset`
- **Purpose**: Reset the timer to add more time
- **Structure**: POST request
- **Headers**:
  - `x-auth-token`: `{{token}}`
- **Request Body**:
  ```json
  {
    "reason": "Testing timer reset functionality"
  }
  ```
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Timer has been reset", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.newExpirationTime).to.exist;
    pm.expect(jsonData.resetBy).to.exist;
    pm.expect(jsonData.resets).to.exist;
  });

  pm.test("New expiration time is in the future", function() {
    var jsonData = pm.response.json();
    var newExpiryTime = new Date(jsonData.newExpirationTime).getTime();
    var now = new Date().getTime();
    pm.expect(newExpiryTime).to.be.greaterThan(now);
  });
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Timer reset successfully",
    "newExpirationTime": "2023-04-05T19:35:00.000Z",
    "resetBy": "admin",
    "resets": {
      "last24Hours": 1,
      "total": 1
    }
  }
  ```

## Message API Tests

### Test: Start Message Timer

- **API Route**: `{{baseUrl}}/api/message/start`
- **Purpose**: Start a message timer after the main timer has expired
- **Structure**: POST request
- **Headers**:
  - `x-auth-token`: `{{token}}`
- **Request Body**:
  ```json
  {
    "url": "https://example.com/test-message"
  }
  ```
- **Note**: This test requires the main timer to be expired but not yet in RDI state
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Message timer has been started", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.timer).to.exist;
    pm.expect(jsonData.timer.triggerTime).to.exist;
    pm.expect(jsonData.timer.remainingTime).to.exist;
    pm.expect(jsonData.timer.messageContent).to.exist;
  });

  pm.test("Message timer trigger time is in the future", function() {
    var jsonData = pm.response.json();
    var triggerTime = new Date(jsonData.timer.triggerTime).getTime();
    var now = new Date().getTime();
    pm.expect(triggerTime).to.be.greaterThan(now);
  });
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Message timer started",
    "timer": {
      "triggerTime": "2023-04-05T19:31:30.000Z",
      "remainingTime": 90000,
      "messageContent": {
        "text": "Test message created at 2023-04-05T19:30:00.000Z",
        "url": "https://example.com/test-message"
      }
    }
  }
  ```

### Test: Process Message (Admin/System Test)

- **API Route**: `{{baseUrl}}/api/message/process`
- **Purpose**: Process a message timer that has been triggered
- **Structure**: POST request
- **Headers**:
  - `x-cron-secret`: Your CRON_SECRET value from .env
- **Note**: This endpoint is typically called by a cron job or system process
- **Tests to Add**:
  ```javascript
  pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
  });

  pm.test("Response has success flag", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
  });

  pm.test("Response contains result info", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.message).to.exist;
    
    // If message was processed
    if (jsonData.result) {
      pm.expect(jsonData.result.success).to.exist;
    }
  });
  ```
- **Expected Response** (when message processed):
  ```json
  {
    "success": true,
    "message": "Message timer processed",
    "result": {
      "success": true,
      "messageId": "msg_1680724800000"
    }
  }
  ```
- **Expected Response** (when no message to process):
  ```json
  {
    "success": true,
    "message": "No active message timer to process",
    "processed": false
  }
  ```

## Test Ordering Recommendation

For proper testing, follow this sequence:

1. Login to obtain authentication token
2. Check timer expiry
3. Reset timer if needed
4. Wait for timer to expire or use update-state.ts to set it as expired
5. Start message timer
6. Process message timer

## Additional Notes

- Run the database hydration scripts before testing to ensure all required data is present
- Use the `update-state.ts` script to manipulate the timer state for testing different scenarios
- Remember that some tests require specific timer states (expired/not expired) 