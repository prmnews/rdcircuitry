# Timer Expire Specifications

## Objectives
 1. When the primary timer expires /dashboard/, we
 2. Have a lag timer /message/ that expires, we
 3. Want to enforce the correct state
    - We need to add additional logic to on app start conditions
    - We need to also add logic for expired conditions

## Use case #1 - App load when isRDI = true
 1. Assume user is logged in
 2. When the app loads, check isRDI in the {state} collection
 3. If isRDI = true, then redirect to the /message/ endpoint 
 4. Hydrate the UI with the singleton in {messagetimers} collection as it is in the database
 5. Display the /message/ endpoint with the {messagetimers} data:
    - If not already done, this is the message:
      - "No further action possible. This application has successfuly managed the isRDI state to a true condition."
 6. A user is not able to manipulate the URL routes to revert back to any routes
    - Therefore, stop all url hacking attempts
 7. A user is not able to see the profile page, the profile nav option should be disabled
 8. A user is not able to get to the /dashboard/ route, the dashboard nav option should be disabled

## Use case #2 - The app has a Expiration of both Primary + Lag Timers
 1. The app will always stay on the "Message Broadcast Status" /message/ endpoint upon expiration of:
    - The lag timer,
    - The broadcast of the x.com post
 2. Display the current state and render the appropriate message:
    - "No further action possible. This application has successfuly managed the isRDI state to a true condition."
 3. A user is not able to manipulate the URL routes to revert back to /dashboard/

