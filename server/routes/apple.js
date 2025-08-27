const express = require("express");
const {
  User,
  Subscription,
  AppleNotification,
  SubscriptionEventLog,
} = require("../models");
const {
  verifyReceiptWithApple,
  getTransactionHistory,
  getSubscriptionStatus,
  decodeJwtPayload,
} = require("../utils/appleUtils");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const router = express.Router();

// Apple App Store Server Notifications webhook
router.post("/notifications", async (req, res) => {
  try {
    // Handle signed payload from Apple
    let notificationData = req.body;

    // If there's a signedPayload, we need to decode it
    if (req.body.signedPayload) {
      try {
        // The signedPayload is a JWT token, we need to decode the payload part
        const payload = req.body.signedPayload.split(".")[1];
        // Base64 decode the payload (with proper padding)
        const decodedPayload = Buffer.from(payload, "base64").toString("utf8");
        notificationData = JSON.parse(decodedPayload);
      } catch (decodeError) {
        console.error("Failed to decode signedPayload:", decodeError);
        // If we can't decode, we'll use the raw data
        notificationData = req.body;
      }
    }

    const notificationType =
      notificationData.notification_type ||
      notificationData.notificationType ||
      (notificationData.data && notificationData.data.notificationType);

    // 写入日志
    fs.appendFileSync(
      "server/logs/apple_notification_v2.log",
      JSON.stringify(notificationData, null, 2)
    );
    console.log("Received Apple notification:", {
      type: notificationType,
      hasSignedPayload: !!req.body.signedPayload,
      data: notificationData,
    });

    // Save notification to database
    const notification = new AppleNotification({
      notificationType: notificationType,
      originalTransactionId:
        notificationData.original_transaction_id ||
        (notificationData.data && notificationData.data.originalTransactionId),
      productId:
        notificationData.product_id ||
        (notificationData.data && notificationData.data.productId),
      transactionId:
        notificationData.transaction_id ||
        (notificationData.data && notificationData.data.transactionId),
      environment: process.env.APPLE_ENVIRONMENT,
      rawNotification: req.body, // Save the raw data including signedPayload
    });

    await notification.save();

    // Handle different notification types
    switch (notificationType) {
      case "SUBSCRIBED":
      case "DID_RENEW":
        console.log("Subscription renewed successfully");
        // Update subscription status and expiry date in database
        break;

      case "DID_CHANGE_RENEWAL_PREF":
        console.log("User changed renewal preference");
        // Update subscription status in database
        break;

      case "DID_CHANGE_RENEWAL_STATUS":
        console.log("User changed renewal status");
        // Update subscription status in database
        break;

      case "EXPIRED":
      case "DID_FAIL_TO_RENEW":
        console.log("Subscription expired or failed to renew");
        // Update subscription status in database
        break;

      case "DID_RECOVER":
        console.log("User recovered subscription");
        // Update subscription status in database
        break;

      case "INITIAL_BUY":
        console.log("Initial purchase made");
        // Handle initial purchase
        break;

      case "INTERACTIVE_RENEWAL":
        console.log("User renewed subscription interactively");
        // Update subscription status in database
        break;

      case "PRICE_INCREASE_CONSENT":
        console.log("User consented to price increase");
        break;

      case "REFUND":
        console.log("Purchase was refunded");
        // Update subscription status in database
        break;

      case "REVOKE":
        console.log("Subscription was revoked");
        // Update subscription status in database
        break;

      default:
        console.log("Unknown notification type:", notificationType);
    }

    // Send success response to Apple
    res.status(200).json({
      success: true,
      message: "Notification received and processed",
    });
  } catch (error) {
    console.error("Apple notification processing error:", error);
    // Even if we have an error, we should still send a 200 response to Apple
    // to prevent them from retrying the notification
    res.status(200).json({
      success: false,
      message: "Notification received but processing failed",
    });
  }
});

// Apple App Store Server Notifications v2 webhook
router.post("/notifications-v2", async (req, res) => {
  try {
    // Handle signed payload from Apple (v2 notifications)
    const rawData = req.body;

    // Log the raw notification for debugging
    console.log(
      "Raw Apple notification v2 received:",
      JSON.stringify(rawData, null, 2)
    );

    let notificationData = rawData;

    // If there's a signedPayload, we need to decode it
    if (rawData.signedPayload) {
      try {
        // The signedPayload is a JWT token, we need to decode the payload part
        const payload = rawData.signedPayload.split(".")[1];
        // Base64 decode the payload (with proper padding)
        const decodedPayload = Buffer.from(payload, "base64").toString("utf8");
        notificationData = JSON.parse(decodedPayload);
      } catch (decodeError) {
        console.error("Failed to decode signedPayload:", decodeError);
      }
    }

    const notificationType = notificationData.notificationType;
    const subtype = notificationData.subtype;

    console.log("Processing Apple notification v2:", {
      type: notificationType,
      subtype: subtype,
      hasSignedPayload: !!rawData.signedPayload,
    });

    // Extract transaction info if available
    let transactionInfo = null;
    if (notificationData.data && notificationData.data.signedTransactionInfo) {
      try {
        // Decode the signedTransactionInfo JWT payload
        transactionInfo = decodeJwtPayload(
          notificationData.data.signedTransactionInfo
        );
        console.log(
          "Decoded transaction info:",
          JSON.stringify(transactionInfo, null, 2)
        );
      } catch (decodeError) {
        console.error("Failed to decode signedTransactionInfo:", decodeError);
      }
    }

    // Extract renewal info if available
    let renewalInfo = null;
    if (notificationData.data && notificationData.data.signedRenewalInfo) {
      try {
        // Decode the signedRenewalInfo JWT payload
        renewalInfo = decodeJwtPayload(notificationData.data.signedRenewalInfo);
        console.log(
          "Decoded renewal info:",
          JSON.stringify(renewalInfo, null, 2)
        );
      } catch (decodeError) {
        console.error("Failed to decode signedRenewalInfo:", decodeError);
      }
    }

    // Get original transaction ID
    const originalTransactionId =
      (transactionInfo && transactionInfo.originalTransactionId) ||
      (renewalInfo && renewalInfo.originalTransactionId);

    // Get user ID (in a real app, you would map this from the transaction info)
    // For now, we'll use a placeholder
    const userId = "test-user-001";

    // Save notification to database
    const notification = new AppleNotification({
      notificationType: notificationType,
      subtype: subtype,
      originalTransactionId: originalTransactionId,
      productId: transactionInfo && transactionInfo.productId,
      transactionId: transactionInfo && transactionInfo.transactionId,
      environment:
        (transactionInfo && transactionInfo.environment) ||
        (renewalInfo && renewalInfo.environment) ||
        (notificationData.data && notificationData.data.environment),
      rawNotification: rawData, // Save the raw data including signedPayload
    });

    await notification.save();

    // Handle different notification types for v2 and update subscription status
    await handleSubscriptionEvent(
      userId,
      originalTransactionId,
      notificationType,
      subtype,
      transactionInfo,
      renewalInfo,
      notification._id
    );

    // Send success response to Apple
    res.status(200).json({
      success: true,
      message: "Notification received and processed",
    });
  } catch (error) {
    console.error("Apple notification v2 processing error:", error);
    // Even if we have an error, we should still send a 200 response to Apple
    // to prevent them from retrying the notification
    res.status(200).json({
      success: false,
      message: "Notification received but processing failed",
    });
  }
});

// Handle subscription events and update database
async function handleSubscriptionEvent(
  userId,
  originalTransactionId,
  notificationType,
  subtype,
  transactionInfo,
  renewalInfo,
  notificationId
) {
  try {
    // Find existing subscription or create new one
    let subscription = await Subscription.findOne({ originalTransactionId });

    if (!subscription && transactionInfo) {
      // Create new subscription
      subscription = new Subscription({
        userId: userId,
        originalTransactionId: originalTransactionId,
        productId: transactionInfo.productId,
        subscriptionType: determineSubscriptionType(transactionInfo.productId),
        purchaseDate: new Date(transactionInfo.purchaseDate),
        expiryDate: new Date(transactionInfo.expiresDate),
        status: "active",
        receiptData: "", // In a real app, you would store the receipt data
        price: transactionInfo.price,
        currency: transactionInfo.currency,
        environment: transactionInfo.environment,
      });

      await subscription.save();

      // Also update user subscription info
      await User.findOneAndUpdate(
        { userId: userId },
        {
          appleOriginalTransactionId: originalTransactionId,
          subscriptionStatus: "active",
          subscriptionType: subscription.subscriptionType,
          subscriptionExpiryDate: subscription.expiryDate,
          lastVerifiedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // Update subscription based on notification type
    let newStatus = subscription ? subscription.status : "unknown";
    let eventDetails = {};

    switch (notificationType) {
      case "SUBSCRIBED":
        newStatus = "active";
        if (transactionInfo) {
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              status: "active",
              expiryDate: new Date(transactionInfo.expiresDate),
              purchaseDate: new Date(transactionInfo.purchaseDate),
              autoRenewStatus: transactionInfo.autoRenewStatus === "1",
            }
          );
        }
        break;

      case "DID_RENEW":
        newStatus = "active";
        if (transactionInfo) {
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              status: "active",
              expiryDate: new Date(transactionInfo.expiresDate),
              autoRenewStatus: transactionInfo.autoRenewStatus === "1",
            }
          );
        }
        break;

      case "DID_CHANGE_RENEWAL_PREF":
        if (renewalInfo) {
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              autoRenewStatus: renewalInfo.autoRenewStatus === "1",
            }
          );
        }
        break;

      case "DID_CHANGE_RENEWAL_STATUS":
        if (renewalInfo) {
          const autoRenewStatus = renewalInfo.autoRenewStatus === "1";
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              autoRenewStatus: autoRenewStatus,
            }
          );

          // If auto-renew is turned off, it might indicate cancellation
          if (!autoRenewStatus) {
            newStatus = "cancelled";
            eventDetails.reason = "auto_renew_turned_off";
          }
        }
        break;

      case "EXPIRED":
        newStatus = "expired";
        await Subscription.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            status: "expired",
          }
        );
        break;

      case "DID_FAIL_TO_RENEW":
        newStatus = "grace_period";
        if (transactionInfo) {
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              status: "grace_period",
              gracePeriodDate: new Date(),
            }
          );
        }
        break;

      case "DID_RECOVER":
        newStatus = "active";
        if (transactionInfo) {
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              status: "active",
              expiryDate: new Date(transactionInfo.expiresDate),
            }
          );
        }
        break;

      case "REFUND":
        newStatus = "refunded";
        if (transactionInfo) {
          await Subscription.findOneAndUpdate(
            { originalTransactionId: originalTransactionId },
            {
              status: "refunded",
              refundDate: new Date(),
            }
          );
        }
        break;

      case "REVOKE":
        newStatus = "expired";
        await Subscription.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            status: "expired",
          }
        );
        break;

      case "PRICE_INCREASE":
        eventDetails.consentStatus =
          subtype === "ACCEPTED" ? "accepted" : "declined";
        break;

      case "GRACE_PERIOD_EXPIRED":
        newStatus = "expired";
        await Subscription.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            status: "expired",
          }
        );
        break;
    }

    // Update user subscription status
    if (subscription) {
      await User.findOneAndUpdate(
        { userId: userId },
        {
          subscriptionStatus: newStatus,
          subscriptionExpiryDate: subscription.expiryDate,
          lastVerifiedAt: new Date(),
        }
      );
    }

    // Log the subscription event
    if (subscription) {
      const eventLog = new SubscriptionEventLog({
        userId: userId,
        subscriptionId: subscription._id,
        eventType: mapNotificationTypeToEventType(notificationType, subtype),
        details: eventDetails,
        transactionInfo: transactionInfo,
        renewalInfo: renewalInfo,
      });

      await eventLog.save();
    }

    // Mark notification as processed
    await AppleNotification.findByIdAndUpdate(notificationId, {
      processed: true,
      processedAt: new Date(),
    });

    console.log(
      `Processed subscription event: ${notificationType} for user ${userId}`
    );
  } catch (error) {
    console.error("Error handling subscription event:", error);
  }
}

// Map notification type to event type for logging
function mapNotificationTypeToEventType(notificationType, subtype) {
  const mapping = {
    SUBSCRIBED: "subscribed",
    DID_RENEW: "renewed",
    DID_CHANGE_RENEWAL_PREF: "renewed", // For simplicity, we map this to renewed
    DID_CHANGE_RENEWAL_STATUS: "renewed", // For simplicity, we map this to renewed
    EXPIRED: "expired",
    DID_FAIL_TO_RENEW: "failed_to_renew",
    DID_RECOVER: "renewed",
    REFUND: "refunded",
    REVOKE: "revoke",
    PRICE_INCREASE: "price_increase",
  };

  // Special handling for subtypes
  if (notificationType === "PRICE_INCREASE") {
    return subtype === "ACCEPTED"
      ? "price_increase_accepted"
      : "price_increase_declined";
  }

  return mapping[notificationType] || "unknown";
}

// Determine subscription type from product ID
function determineSubscriptionType(productId) {
  if (productId.includes("month")) {
    return "monthly";
  } else if (productId.includes("year")) {
    return "yearly";
  } else if (productId.includes("quarter")) {
    return "quarterly";
  }
  return "unknown";
}

// Create test user endpoint
router.post("/test-user", async (req, res) => {
  try {
    const testUserId = "test-user-001";

    // Create or update test user
    const user = await User.findOneAndUpdate(
      { userId: testUserId },
      {
        userId: testUserId,
        subscriptionStatus: "expired",
        subscriptionType: null,
        subscriptionExpiryDate: null,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Test user created/updated successfully",
      data: {
        userId: user.userId,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create test user",
      message: error.message,
    });
  }
});

// Get test user subscription status
router.get("/test-user/status", async (req, res) => {
  try {
    const testUserId = "test-user-001";

    const user = await User.findOne({ userId: testUserId });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Test user not found",
      });
    }

    // Also get subscription details
    const subscription = await Subscription.findOne({
      originalTransactionId: user.appleOriginalTransactionId,
    });

    res.json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionType: user.subscriptionType,
          subscriptionExpiryDate: user.subscriptionExpiryDate,
          lastVerifiedAt: user.lastVerifiedAt,
        },
        subscription: subscription
          ? {
              productId: subscription.productId,
              subscriptionType: subscription.subscriptionType,
              purchaseDate: subscription.purchaseDate,
              expiryDate: subscription.expiryDate,
              status: subscription.status,
              autoRenewStatus: subscription.autoRenewStatus,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching test user status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch test user status",
      message: error.message,
    });
  }
});

// Get subscription event logs
router.get("/test-user/events", async (req, res) => {
  try {
    const testUserId = "test-user-001";

    const events = await SubscriptionEventLog.find({ userId: testUserId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching subscription events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch subscription events",
      message: error.message,
    });
  }
});

// Verify receipt endpoint (alternative to subscriptions/verify)
router.post("/verify-receipt", async (req, res) => {
  try {
    const { receiptData } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        error: "Missing required field: receiptData",
      });
    }

    // Verify receipt with Apple
    const verificationResult = await verifyReceiptWithApple(receiptData);

    res.json({
      success: true,
      data: verificationResult,
    });
  } catch (error) {
    console.error("Receipt verification error:", error);
    res.status(500).json({
      error: "Internal server error during receipt verification",
      message: error.message,
    });
  }
});

// Get transaction history
router.get("/transaction-history/:originalTransactionId", async (req, res) => {
  try {
    const { originalTransactionId } = req.params;

    if (!originalTransactionId) {
      return res.status(400).json({
        error: "Missing required parameter: originalTransactionId",
      });
    }

    const history = await getTransactionHistory(originalTransactionId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    res.status(500).json({
      error: "Internal server error while fetching transaction history",
      message: error.message,
    });
  }
});

// Get subscription status
router.get("/subscription-status/:originalTransactionId", async (req, res) => {
  try {
    const { originalTransactionId } = req.params;

    if (!originalTransactionId) {
      return res.status(400).json({
        error: "Missing required parameter: originalTransactionId",
      });
    }

    const status = await getSubscriptionStatus(originalTransactionId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    res.status(500).json({
      error: "Internal server error while fetching subscription status",
      message: error.message,
    });
  }
});

module.exports = router;
