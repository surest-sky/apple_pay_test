# Apple Pay Subscription Notification Tests

This directory contains tests for the Apple Pay subscription notification handling.

## Files

1. `appleNotification.test.js` - Unit tests for all Apple subscription notification types
2. `testServer.js` - Express server for manual testing
3. `package.json` - Test project dependencies

## Running Tests

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run unit tests:
   ```bash
   npm test
   ```

3. Start test server for manual testing:
   ```bash
   npm start
   ```

## Test Scenarios

The unit tests cover the following Apple subscription notification types:

1. SUBSCRIBED - Initial subscription
2. DID_RENEW - Subscription renewal
3. DID_CHANGE_RENEWAL_PREF - Subscription upgrade/downgrade
4. DID_CHANGE_RENEWAL_STATUS - Auto-renewal status changes
5. EXPIRED - Subscription expiration
6. REFUND - Subscription refund
7. DID_FAIL_TO_RENEW - Subscription renewal failure
8. PRICE_INCREASE - Price increase notifications (accepted/declined)

Each test uses mock data that matches the format of actual Apple notifications.