const express = require('express');
const { User, Subscription, AppleNotification } = require('../models');
const { 
  verifyReceiptWithApple, 
  parseReceiptData, 
  isSubscriptionActive 
} = require('../utils/appleUtils');

const router = express.Router();

// Verify subscription receipt
router.post('/verify', async (req, res) => {
  try {
    const { receiptData, userId } = req.body;

    if (!receiptData || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: receiptData and userId' 
      });
    }

    // Verify receipt with Apple
    const verificationResult = await verifyReceiptWithApple(receiptData);
    
    if (verificationResult.status !== 0) {
      return res.status(400).json({ 
        error: 'Receipt verification failed',
        appleStatus: verificationResult.status
      });
    }

    // Parse receipt data
    const parsedData = parseReceiptData(verificationResult);
    
    if (!parsedData) {
      return res.status(500).json({ 
        error: 'Failed to parse receipt data' 
      });
    }

    // Find the latest transaction
    let latestTransaction = null;
    let latestExpiryDate = new Date(0);
    
    Object.values(parsedData.productTransactions).forEach(transaction => {
      const expiryDate = new Date(transaction.expires_date_ms);
      if (expiryDate > latestExpiryDate) {
        latestExpiryDate = expiryDate;
        latestTransaction = transaction;
      }
    });

    if (!latestTransaction) {
      return res.status(400).json({ 
        error: 'No valid transactions found in receipt' 
      });
    }

    // Determine subscription type
    const productId = latestTransaction.product_id;
    let subscriptionType = 'unknown';
    
    if (productId.includes('month')) {
      subscriptionType = 'monthly';
    } else if (productId.includes('year')) {
      subscriptionType = 'yearly';
    } else if (productId.includes('quarter')) {
      subscriptionType = 'quarterly';
    }

    // Check if subscription is active
    const isActive = isSubscriptionActive(latestTransaction);
    const status = isActive ? 'active' : 'expired';

    // Update or create user record
    const user = await User.findOneAndUpdate(
      { userId: userId },
      {
        appleReceiptData: receiptData,
        appleOriginalTransactionId: latestTransaction.original_transaction_id,
        subscriptionStatus: status,
        subscriptionType: subscriptionType,
        subscriptionExpiryDate: latestExpiryDate,
        lastVerifiedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Update or create subscription record
    const subscription = await Subscription.findOneAndUpdate(
      { originalTransactionId: latestTransaction.original_transaction_id },
      {
        userId: userId,
        productId: productId,
        subscriptionType: subscriptionType,
        purchaseDate: new Date(latestTransaction.purchase_date_ms),
        expiryDate: latestExpiryDate,
        status: status,
        receiptData: receiptData,
        latestReceiptData: verificationResult.latest_receipt,
        environment: process.env.APPLE_ENVIRONMENT
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Receipt verified successfully',
      data: {
        user: {
          userId: user.userId,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionType: user.subscriptionType,
          subscriptionExpiryDate: user.subscriptionExpiryDate,
          lastVerifiedAt: user.lastVerifiedAt
        },
        subscription: {
          productId: subscription.productId,
          subscriptionType: subscription.subscriptionType,
          purchaseDate: subscription.purchaseDate,
          expiryDate: subscription.expiryDate,
          status: subscription.status
        },
        isActive: isActive
      }
    });
  } catch (error) {
    console.error('Receipt verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error during receipt verification',
      message: error.message
    });
  }
});

// Get user subscription status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: userId });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.userId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionType: user.subscriptionType,
        subscriptionExpiryDate: user.subscriptionExpiryDate,
        lastVerifiedAt: user.lastVerifiedAt
      }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching subscription status',
      message: error.message
    });
  }
});

// Refresh subscription status
router.post('/refresh/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: userId });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    if (!user.appleReceiptData) {
      return res.status(400).json({ 
        error: 'No receipt data found for user' 
      });
    }

    // Verify receipt with Apple
    const verificationResult = await verifyReceiptWithApple(user.appleReceiptData);
    
    if (verificationResult.status !== 0) {
      return res.status(400).json({ 
        error: 'Receipt verification failed',
        appleStatus: verificationResult.status
      });
    }

    // Parse receipt data
    const parsedData = parseReceiptData(verificationResult);
    
    if (!parsedData) {
      return res.status(500).json({ 
        error: 'Failed to parse receipt data' 
      });
    }

    // Find the latest transaction
    let latestTransaction = null;
    let latestExpiryDate = new Date(0);
    
    Object.values(parsedData.productTransactions).forEach(transaction => {
      const expiryDate = new Date(transaction.expires_date_ms);
      if (expiryDate > latestExpiryDate) {
        latestExpiryDate = expiryDate;
        latestTransaction = transaction;
      }
    });

    if (!latestTransaction) {
      return res.status(400).json({ 
        error: 'No valid transactions found in receipt' 
      });
    }

    // Determine subscription type
    const productId = latestTransaction.product_id;
    let subscriptionType = 'unknown';
    
    if (productId.includes('month')) {
      subscriptionType = 'monthly';
    } else if (productId.includes('year')) {
      subscriptionType = 'yearly';
    } else if (productId.includes('quarter')) {
      subscriptionType = 'quarterly';
    }

    // Check if subscription is active
    const isActive = isSubscriptionActive(latestTransaction);
    const status = isActive ? 'active' : 'expired';

    // Update user record
    const updatedUser = await User.findOneAndUpdate(
      { userId: userId },
      {
        subscriptionStatus: status,
        subscriptionType: subscriptionType,
        subscriptionExpiryDate: latestExpiryDate,
        lastVerifiedAt: new Date()
      },
      { new: true }
    );

    // Update subscription record
    const subscription = await Subscription.findOneAndUpdate(
      { originalTransactionId: latestTransaction.original_transaction_id },
      {
        expiryDate: latestExpiryDate,
        status: status,
        latestReceiptData: verificationResult.latest_receipt
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Subscription status refreshed successfully',
      data: {
        user: {
          userId: updatedUser.userId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          subscriptionType: updatedUser.subscriptionType,
          subscriptionExpiryDate: updatedUser.subscriptionExpiryDate,
          lastVerifiedAt: updatedUser.lastVerifiedAt
        },
        subscription: {
          productId: subscription.productId,
          subscriptionType: subscription.subscriptionType,
          purchaseDate: subscription.purchaseDate,
          expiryDate: subscription.expiryDate,
          status: subscription.status
        },
        isActive: isActive
      }
    });
  } catch (error) {
    console.error('Refresh subscription status error:', error);
    res.status(500).json({ 
      error: 'Internal server error while refreshing subscription status',
      message: error.message
    });
  }
});

module.exports = router;