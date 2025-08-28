const express = require('express');
const { handleSubscriptionEvent } = require('../routes/apple');

const app = express();
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = app;