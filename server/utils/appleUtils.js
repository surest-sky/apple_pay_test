const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Apple App Store Server API configuration
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;
const APPLE_ENVIRONMENT = process.env.APPLE_ENVIRONMENT || 'sandbox';

// Load Apple private key
let applePrivateKey = null;
if (APPLE_PRIVATE_KEY_PATH && fs.existsSync(APPLE_PRIVATE_KEY_PATH)) {
  applePrivateKey = fs.readFileSync(APPLE_PRIVATE_KEY_PATH, 'utf8');
}

// Generate JWT token for App Store Server API
const generateAppleAuthToken = () => {
  if (!applePrivateKey) {
    throw new Error('Apple private key not found');
  }

  const payload = {
    iss: APPLE_ISSUER_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    aud: 'appstoreconnect-v1'
  };

  return jwt.sign(payload, applePrivateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: APPLE_KEY_ID,
      typ: 'JWT'
    }
  });
};

// Verify receipt with Apple App Store
const verifyReceiptWithApple = async (receiptData, isRetry = false) => {
  try {
    const environment = APPLE_ENVIRONMENT === 'production' ? 'buy' : 'sandbox';
    const url = `https://${environment}.itunes.apple.com/verifyReceipt`;

    const response = await axios.post(url, {
      'receipt-data': receiptData,
      password: APPLE_SHARED_SECRET,
      'exclude-old-transactions': true
    });

    return response.data;
  } catch (error) {
    // If we're in production and verification failed, try sandbox as fallback
    if (APPLE_ENVIRONMENT === 'production' && !isRetry) {
      console.log('Production verification failed, trying sandbox...');
      const originalEnv = APPLE_ENVIRONMENT;
      process.env.APPLE_ENVIRONMENT = 'sandbox';
      try {
        const result = await verifyReceiptWithApple(receiptData, true);
        process.env.APPLE_ENVIRONMENT = originalEnv;
        return result;
      } catch (retryError) {
        process.env.APPLE_ENVIRONMENT = originalEnv;
        throw retryError;
      }
    }
    throw error;
  }
};

// Get Apple App Store Server API token
const getAppleApiToken = () => {
  try {
    return generateAppleAuthToken();
  } catch (error) {
    console.error('Failed to generate Apple API token:', error);
    return null;
  }
};

// Get transaction history from App Store Server API
const getTransactionHistory = async (originalTransactionId) => {
  try {
    const token = getAppleApiToken();
    if (!token) {
      throw new Error('Unable to generate Apple API token');
    }

    const baseUrl = APPLE_ENVIRONMENT === 'production' 
      ? 'https://api.storekit.itunes.apple.com' 
      : 'https://api.storekit-sandbox.itunes.apple.com';

    const url = `${baseUrl}/inApps/v1/history/${originalTransactionId}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get transaction history:', error.response?.data || error.message);
    throw error;
  }
};

// Get subscription status from App Store Server API
const getSubscriptionStatus = async (originalTransactionId) => {
  try {
    const token = getAppleApiToken();
    if (!token) {
      throw new Error('Unable to generate Apple API token');
    }

    const baseUrl = APPLE_ENVIRONMENT === 'production' 
      ? 'https://api.storekit.itunes.apple.com' 
      : 'https://api.storekit-sandbox.itunes.apple.com';

    const url = `${baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get subscription status:', error.response?.data || error.message);
    throw error;
  }
};

// Parse receipt data to extract relevant information
const parseReceiptData = (receiptData) => {
  try {
    const latestReceiptInfo = receiptData.latest_receipt_info || [];
    const receipt = receiptData.receipt || {};
    
    // Find the latest transaction for each product
    const productTransactions = {};
    
    latestReceiptInfo.forEach(transaction => {
      const productId = transaction.product_id;
      const purchaseDate = new Date(transaction.purchase_date_ms);
      
      if (!productTransactions[productId] || 
          new Date(productTransactions[productId].purchase_date_ms) < purchaseDate) {
        productTransactions[productId] = transaction;
      }
    });
    
    return {
      bundleId: receipt.bundle_id,
      appItemId: receipt.app_item_id,
      originalPurchaseDate: receipt.original_purchase_date,
      latestReceipt: receiptData.latest_receipt,
      productTransactions: productTransactions,
      isRetryable: receiptData.is_retryable
    };
  } catch (error) {
    console.error('Failed to parse receipt data:', error);
    return null;
  }
};

// Check if subscription is active
const isSubscriptionActive = (transaction) => {
  try {
    const expiryDate = new Date(transaction.expires_date_ms);
    const currentDate = new Date();
    
    // Check if subscription is expired
    if (expiryDate < currentDate) {
      return false;
    }
    
    // Check cancellation date
    if (transaction.cancellation_date) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
};

// Decode JWT token payload (without verification)
const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;
    
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if necessary
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Base64 decode
    const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
    
    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
};

// Verify and decode Apple JWT token
const verifyAndDecodeAppleJwt = async (token) => {
  try {
    // For now, we'll just decode without verification
    // In production, you should verify the token using Apple's public keys
    return decodeJwtPayload(token);
  } catch (error) {
    console.error('Failed to verify and decode Apple JWT:', error);
    return null;
  }
};

module.exports = {
  verifyReceiptWithApple,
  getTransactionHistory,
  getSubscriptionStatus,
  parseReceiptData,
  isSubscriptionActive,
  getAppleApiToken,
  decodeJwtPayload,
  verifyAndDecodeAppleJwt
};