# Apple Pay Backend Service

A Node.js backend service for handling Apple Pay subscriptions, including receipt verification, subscription management, and Apple App Store server notifications.

## Features

- Receipt verification with Apple App Store
- Subscription status management
- Apple App Store Server Notifications webhook
- User and subscription data storage with MongoDB
- Subscription event logging
- RESTful API endpoints for frontend integration

## Prerequisites

- Node.js 14+
- MongoDB 4.4+
- Apple Developer Account
- Apple App Store Connect credentials

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd apple-pay-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/apple_pay_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Apple App Store Configuration
APPLE_SHARED_SECRET=your-apple-shared-secret
APPLE_ENVIRONMENT=sandbox # or production

# Apple App Store Server API
APPLE_ISSUER_ID=your-app-store-connect-issuer-id
APPLE_KEY_ID=your-private-key-id
APPLE_PRIVATE_KEY_PATH=./config/apple-private-key.p8
```

5. Start MongoDB (if not already running):
```bash
mongod
```

6. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### Subscriptions

- `POST /api/subscriptions/verify` - Verify subscription receipt
- `GET /api/subscriptions/status/:userId` - Get user subscription status
- `POST /api/subscriptions/refresh/:userId` - Refresh subscription status

### Users

- `POST /api/users` - Create or update user
- `GET /api/users/:userId` - Get user by ID
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user

### Apple

- `POST /api/apple/notifications` - Apple App Store Server Notifications webhook
- `POST /api/apple/notifications-v2` - Apple App Store Server Notifications v2 webhook
- `POST /api/apple/test-user` - Create test user
- `GET /api/apple/test-user/status` - Get test user subscription status
- `GET /api/apple/test-user/events` - Get test user subscription events
- `POST /api/apple/verify-receipt` - Verify receipt
- `GET /api/apple/transaction-history/:originalTransactionId` - Get transaction history
- `GET /api/apple/subscription-status/:originalTransactionId` - Get subscription status

## Apple App Store Configuration

1. Obtain your Shared Secret from App Store Connect:
   - Go to App Store Connect
   - Navigate to "My Apps" > "App" > "App Information" > "App Store Server Notifications"
   - Copy the Shared Secret

2. Set up App Store Server API credentials:
   - Create an API key in App Store Connect
   - Download the private key (.p8 file)
   - Place the private key in the `config` directory
   - Update the `.env` file with your credentials

3. Configure App Store Server Notifications:
   - In App Store Connect, set your notification endpoint URL:
     `https://your-domain.com/api/apple/notifications-v2`

## Usage

### Creating a Test User

To create a test user for development and testing:

```bash
curl -X POST http://localhost:3000/api/apple/test-user
```

### Checking Test User Subscription Status

```bash
curl -X GET http://localhost:3000/api/apple/test-user/status
```

### Viewing Subscription Event Logs

```bash
curl -X GET http://localhost:3000/api/apple/test-user/events
```

### Verifying a Receipt

```javascript
// Frontend example
const verifyReceipt = async (receiptData, userId) => {
  const response = await fetch('/api/subscriptions/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiptData: receiptData,
      userId: userId
    })
  });
  
  const result = await response.json();
  return result;
};
```

### Handling Apple Notifications

The server automatically handles Apple App Store Server Notifications at the `/api/apple/notifications-v2` endpoint. Apple will send notifications for events like:

- Subscription creation
- Renewals
- Cancellations
- Expirations
- Refunds

### Checking Subscription Status

```javascript
// Frontend example
const checkSubscriptionStatus = async (userId) => {
  const response = await fetch(`/api/subscriptions/status/${userId}`);
  const result = await response.json();
  return result;
};
```

## Subscription Lifecycle Management

The backend service handles the complete subscription lifecycle:

1. **Subscription Creation** - When a user first subscribes
2. **Renewals** - Automatic handling of periodic renewals
3. **Cancellation** - When user cancels auto-renewal
4. **Expiration** - When subscriptions expire
5. **Refunds** - When users receive refunds
6. **Status Tracking** - Tracking all status changes

### Subscription States

- `active` - Active subscription
- `expired` - Subscription has expired
- `cancelled` - User has cancelled auto-renewal
- `grace_period` - In grace period (renewal failed but still accessible)
- `refunded` - Refunded

## Security Considerations

1. Always verify receipts with Apple servers, never trust client-side data alone
2. Use HTTPS in production
3. Protect your Apple credentials
4. Implement proper rate limiting
5. Validate all input data

## License

MIT License