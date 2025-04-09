# Timer Expire Specifications

## Objectives
 1. When the primary timer expires, we
 2. Have a lag timer that expires, we
 3. Want to enforce the correct state
    - We are adding on-start conditions
    - We are adding on expired conditions

## App load when isRDI = true
 1. When the app loads, check isRDI
 2. If isRDI = true, then redirect to the /message/ endpoint 
 3. Hydrate the UI with the singleton in {messagetimers} collection
 4. Display the current state and render the appropriate message:
    - "No further action possible. This application has successfuly managed the isRDI state to a true condition."
 5. A user is not able to manipulate the URL routes to revert back to /dashboard/

## Ending State on Expiration of Primary + Lag Timers
 1. The app will stay on the "Message Broadcast Status" upon expiration of:
    - The lag timer,
    - The broadcast of the x.com post
 2. Display the current state and render the appropriate message:
    - "No further action possible. This application has successfuly managed the isRDI state to a true condition."
 3. A user is not able to manipulate the URL routes to revert back to /dashboard/

## Implementation

