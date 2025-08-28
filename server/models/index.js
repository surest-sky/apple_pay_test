const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appleReceiptData: {
      type: String,
      default: null,
    },
    appleOriginalTransactionId: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: [
        "active",
        "expired",
        "cancelled",
        "grace_period",
        "refunded",
        "pending_verification",
      ],
      default: "expired",
    },
    status: {
      type: String,
      default: null,
    },
    subscriptionType: {
      type: String,
      enum: ["monthly", "yearly", "quarterly"],
      default: null,
    },
    subscriptionExpiryDate: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Subscription Schema
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    originalTransactionId: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: String,
      required: true,
    },
    subscriptionType: {
      type: String,
      enum: ["monthly", "yearly", "quarterly"],
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "expired",
        "cancelled",
        "grace_period",
        "refunded",
        "pending_verification",
      ],
      default: "active",
    },
    receiptData: {
      type: String,
      required: false,
    },
    latestReceiptData: {
      type: String,
      default: null,
    },
    environment: {
      type: String,
      enum: ["Sandbox", "production"],
      default: "Sandbox",
    },
    autoRenewStatus: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      required: false,
    },
    currency: {
      type: String,
      default: "CNY",
    },
    cancellationDate: {
      type: Date,
      default: null,
    },
    refundDate: {
      type: Date,
      default: null,
    },
    gracePeriodDate: {
      type: Date,
      default: null,
    },
    restoredAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Apple Notification Schema
const appleNotificationSchema = new mongoose.Schema(
  {
    notificationType: {
      type: String,
      required: true,
    },
    subtype: {
      type: String,
      default: null,
    },
    originalTransactionId: {
      type: String,
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      enum: ["Sandbox", "production"],
      default: "Sandbox",
    },
    rawNotification: {
      type: Object,
      required: true,
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Subscription Event Log Schema
const subscriptionEventLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "subscribed", // 订阅成功
        "renewed", // 续订成功
        "cancelled", // 取消订阅
        "expired", // 订阅过期
        "refunded", // 退款
        "failed_to_renew", // 续订失败
        "grace_period", // 宽限期
        "price_increase", // 价格上涨
        "revoke", // 撤销
      ],
    },
    details: {
      type: Object,
      default: {},
    },
    transactionInfo: {
      type: Object,
      default: null,
    },
    renewalInfo: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
const Subscription = mongoose.model("Subscription", subscriptionSchema);
const AppleNotification = mongoose.model(
  "AppleNotification",
  appleNotificationSchema
);
const SubscriptionEventLog = mongoose.model(
  "SubscriptionEventLog",
  subscriptionEventLogSchema
);

module.exports = {
  User,
  Subscription,
  AppleNotification,
  SubscriptionEventLog,
};
