# Timer Specifications

## Introduction
   - This app uses a timer function to measure decremented time

## Dealing with Timezone Standardization
   - There is a UTC standard for all timezones
   - We persist country/timezones in {countiesTZ} collection
   - When the user is onboarded, we bind the "home" timezone to the user profile
   - If the user travels to another timezone, we continue to display the user's home timezone orientation
   - All datetime values are stored in UTC in the database
   - User-facing displays are adjusted by user's gmtOffset
   - No local timezone storage in database
   - All timezone conversions happen at display layer

## Dealing with token/session expiration periods
   - Assuming successful login, we need to ensure the token/session expiration is set to 12 hours
   - If the user token/session times out, then we want to force re-authentication

## On app start workflow
   - Authenticate the user
     - The userName and pinNumber must be sent to the auth api 
     - The apiKey must be validated as matching
     - Ensure the apiKeys.apiStart >= server time UTC AND apiKeys.ExpireDateTime < server time UTC
     - Ensure the isRevoked is false 
     - Ensure the statis is 'active'
     - Enforce the API key, after decrypting it and doing a comparison
   - If truthy, redirect to the protected API /dashboard route
   - Store the users Timezone offset for global use

## Refresh timer workflow
   ## Current Time card
      - There is only one standard for these cards: Current Time, Estimated Expiration
      - The Current Time is adjusted from UTC for that user's Timezone offset
      - Current Time = UTC time +/- Timezone offset
   ## Estimated Expiration card
      - The Estimated Expiration card is retrieved from the {state}.currentState document
      - The Estimated Expiration is stored in UTC in the database
      - The displayed Estimated Expiration card should show the adjusted timezone value of the UTC
      - If the user clicks the refresh button, we updateOne back in {state} document
      - This becomes the new Expiration Date
      - Use a webhook to push the updated Expiration Date to all users that are logged on
   ## Time Remaining Progress card
      - This is a doughnut chart, that counts down the time remaining
      - It displays the hh:mm:ss value 'remaining' and 
      - the doughnut chart value unwinds as the timer decrements
   ## Database updates
      - We updateOne for the current UTC datetime value to the {state} collection
        - the {state} collection has one and only one document, thus a singleton
      - currentState = current UTC at the time of the reset event
      - isRDI = false if the user activates the reset event
      - resetEvents.total = number ++ (all time unrestricted full table scan)
      - resetEvents.last24Hours = number ++ (COUNT with a -24 hour UTC lookback)
      - Note: lastResetTime is deprecated, use currentState for expiration calculations

      - We insertOne for the {events} collection
      - userName = the user that pressed the reset button action
      - isUserValidated = authentication state for that user (it should always be true)
      - Using eventType = 'TIMER_RESET' constant
        - The other eventTypes ['LOGIN','TIMER_RESET','TIMER_EXPIRED','MESSAGE_SCHEDULED','MESSAGE_SENDING','MESSAGE_SENT', ['MESSAGE_FAILED']
      - location = persist the user's location metadata, which includes the information from the user profile:
        - countryCode: { type: String, required: true },
        - countryName: { type: String, required: true },
        - timeZone: { type: String, required: true },
        - gmtOffset: { type: String, required: true }
  
## Reset Events card
   - Each time any user clicks the refresh action:
     - We increment the Reset Events card ++
     - We also record the {events} document

## Alert System
   - There are three visual and conditional states in the Time Remaining and Time Remaining Progress cards
   - If the Time Remaining value is < MESSAGE_YELLOW_MINUTES=2 but > MESSAGE_RED_MINUTES=1 then turn the background 'Yellow'
   - If the Time Remaining value is < MESSAGE_RED_MINUTES <= 1 then turn the background 'Red'
   - If the Time Remaining value is > MESSAGE_YELLOW_MINUTES=2 then the background is default (currently white)

## .env.local Variables
   # Timer Config Settings
     - TIMER_INITIAL_MINUTES=3
     - MESSAGE_ENABLE=false 
     - MESSAGE_YELLOW_MINUTES=2
     - MESSAGE_RED_MINUTES=1

