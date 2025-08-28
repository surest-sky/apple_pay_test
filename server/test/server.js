const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Set timezone to Shanghai
process.env.TZ = 'Asia/Shanghai';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = require('../config/db');
connectDB();

const { handleSubscriptionEvent } = require('../routes/apple');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Test endpoint for subscription events
app.post('/test/subscription-event', async (req, res) => {
  try {
    const {
      userId,
      originalTransactionId,
      notificationType,
      subtype,
      transactionInfo,
      renewalInfo
    } = req.body;

    await handleSubscriptionEvent(
      userId,
      originalTransactionId,
      notificationType,
      subtype,
      transactionInfo,
      renewalInfo,
      null // notificationId (not used in this test)
    );

    res.json({
      success: true,
      message: 'Subscription event processed successfully'
    });
  } catch (error) {
    console.error('Error processing subscription event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process subscription event',
      message: error.message
    });
  }
});

// Endpoint to send test notifications
app.post('/test/send-notification', async (req, res) => {
  try {
    const { notificationType } = req.body;
    
    // Load the appropriate fixture
    const fixturePath = path.join(__dirname, 'fixtures', `${notificationType}.json`);
    
    if (!fs.existsSync(fixturePath)) {
      return res.status(404).json({
        success: false,
        error: 'Fixture not found',
        message: `Fixture for ${notificationType} not found`
      });
    }
    
    const notificationData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    
    // Extract necessary data from the mock notification
    const notificationTypeValue = notificationData.notificationType;
    const subtype = notificationData.subtype;
    
    // Extract transaction info if available
    let transactionInfo = null;
    if (notificationData.data && notificationData.data.signedTransactionInfo) {
      transactionInfo = notificationData.data.signedTransactionInfo;
    }
    
    // Extract renewal info if available
    let renewalInfo = null;
    if (notificationData.data && notificationData.data.signedRenewalInfo) {
      renewalInfo = notificationData.data.signedRenewalInfo;
    }
    
    // Get original transaction ID
    const originalTransactionId = 
      (transactionInfo && transactionInfo.originalTransactionId) || 
      (renewalInfo && renewalInfo.originalTransactionId) || 
      notificationData.originalTransactionId ||
      (notificationData.data && notificationData.data.originalTransactionId) ||
      "2000000800763101";
    
    // Test user ID
    const userId = "test-user-001";
    
    // Call the handleSubscriptionEvent function
    await handleSubscriptionEvent(
      userId,
      originalTransactionId,
      notificationTypeValue,
      subtype,
      transactionInfo,
      renewalInfo,
      null // notificationId (not used in this test)
    );
    
    res.json({
      success: true,
      message: `Test notification ${notificationType} processed successfully`,
      data: notificationData
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files for the test interface
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Test server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test interface: http://localhost:${PORT}`);
});

module.exports = app;