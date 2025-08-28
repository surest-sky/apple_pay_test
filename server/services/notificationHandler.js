const fs = require("fs");
const path = require("path");
const { AppleNotification, SubscriptionEventLog } = require("../models");
const appleApiService = require("./appleApiService");
const subscriptionService = require("./subscriptionService");

/**
 * 苹果服务器通知处理器
 *
 * 职责：
 * - 处理Apple App Store Server Notifications
 * - 解码和验证通知数据
 * - 根据通知类型执行相应的业务逻辑
 * - 记录通知日志
 */
class NotificationHandler {
  constructor() {
    this.logFilePath = path.join(
      __dirname,
      "../logs/apple_notifications_v2.log"
    );
    this._ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   * @private
   */
  _ensureLogDirectory() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 处理Apple服务器通知
   * @param {Object} rawNotification - 原始通知数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleAppleNotification(rawNotification) {
    try {
      console.log("📨 收到Apple服务器通知");

      // 解码通知数据
      const decodedNotification = await this._decodeNotification(
        rawNotification
      );
      if (!decodedNotification.success) {
        return decodedNotification;
      }

      const notificationData = decodedNotification.data;

      // 记录通知日志
      await this._logNotification(notificationData);

      // 保存通知到数据库
      await this._saveNotification(notificationData);

      // 处理具体的通知类型
      const result = await this._processNotificationByType(notificationData);

      console.log("✅ Apple服务器通知处理完成");
      return {
        success: true,
        message: "通知处理成功",
        data: result,
      };
    } catch (error) {
      console.error("❌ Apple服务器通知处理失败:", error.message);
      return {
        success: false,
        error: "NOTIFICATION_PROCESSING_ERROR",
        message: error.message,
      };
    }
  }

  /**
   * 解码通知数据
   * @private
   */
  async _decodeNotification(rawNotification) {
    try {
      let notificationData = rawNotification;

      // 如果有signedPayload，需要解码
      if (rawNotification.signedPayload) {
        console.log("🔓 解码signedPayload");
        const decodeResult = appleApiService.decodeJwtPayload(
          rawNotification.signedPayload
        );

        if (!decodeResult.success) {
          return {
            success: false,
            error: "DECODE_ERROR",
            message: "解码signedPayload失败",
            details: decodeResult.error,
          };
        }

        notificationData = decodeResult.data;
      }

      return {
        success: true,
        data: notificationData,
      };
    } catch (error) {
      return {
        success: false,
        error: "DECODE_ERROR",
        message: error.message,
      };
    }
  }

  /**
   * 记录通知日志到文件
   * @private
   */
  async _logNotification(notificationData) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        notificationType: this._extractNotificationType(notificationData),
        data: notificationData,
      };

      const logLine = JSON.stringify(logEntry) + "\n";
      fs.appendFileSync(this.logFilePath, logLine);

      console.log("📝 通知日志已记录");
    } catch (error) {
      console.error("❌ 记录通知日志失败:", error.message);
      // 不抛出错误，因为日志记录失败不应该影响主要业务逻辑
    }
  }

  /**
   * 保存通知到数据库
   * @private
   */
  async _saveNotification(notificationData) {
    try {
      const notification = new AppleNotification({
        notificationType: this._extractNotificationType(notificationData),
        notificationData: notificationData,
        receivedAt: new Date(),
        processed: false,
      });

      await notification.save();
      console.log("💾 通知已保存到数据库");

      return notification;
    } catch (error) {
      console.error("❌ 保存通知到数据库失败:", error.message);
      throw error;
    }
  }

  /**
   * 根据通知类型处理业务逻辑
   * @private
   */
  async _processNotificationByType(notificationData) {
    const notificationType = this._extractNotificationType(notificationData);

    console.log(`🔄 处理通知类型: ${notificationType}`);

    const handlers = {
      SUBSCRIBED: this._handleSubscribed.bind(this),
      DID_RENEW: this._handleDidRenew.bind(this),
      EXPIRED: this._handleExpired.bind(this),
      DID_FAIL_TO_RENEW: this._handleFailedToRenew.bind(this),
      DID_CHANGE_RENEWAL_STATUS: this._handleRenewalStatusChange.bind(this),
      PRICE_INCREASE: this._handlePriceIncrease.bind(this),
      REFUND: this._handleRefund.bind(this),
      DOWNGRADE: this._handleDowngrade.bind(this),
      UPGRADE: this._handleUpgrade.bind(this),
    };

    const handler = handlers[notificationType];
    if (handler) {
      return await handler(notificationData);
    } else {
      console.log(`⚠️ 未处理的通知类型: ${notificationType}`);
      return {
        type: "UNHANDLED",
        notificationType,
        message: "未处理的通知类型",
      };
    }
  }

  /**
   * 提取通知类型
   * @private
   */
  _extractNotificationType(notificationData) {
    return (
      notificationData.notification_type ||
      notificationData.notificationType ||
      (notificationData.data && notificationData.data.notificationType) ||
      "UNKNOWN"
    );
  }

  /**
   * 处理订阅成功通知
   * @private
   */
  async _handleSubscribed(notificationData) {
    console.log("🎉 处理订阅成功通知");
    // 实现订阅成功的业务逻辑
    return {
      type: "SUBSCRIBED",
      message: "订阅成功处理完成",
    };
  }

  /**
   * 处理续订成功通知
   * @private
   */
  async _handleDidRenew(notificationData) {
    console.log("🔄 处理续订成功通知");
    // 实现续订成功的业务逻辑
    return {
      type: "DID_RENEW",
      message: "续订成功处理完成",
    };
  }

  /**
   * 处理订阅过期通知
   * @private
   */
  async _handleExpired(notificationData) {
    console.log("⏰ 处理订阅过期通知");
    // 实现订阅过期的业务逻辑
    return {
      type: "EXPIRED",
      message: "订阅过期处理完成",
    };
  }

  /**
   * 处理续订失败通知
   * @private
   */
  async _handleFailedToRenew(notificationData) {
    console.log("❌ 处理续订失败通知");
    // 实现续订失败的业务逻辑
    return {
      type: "DID_FAIL_TO_RENEW",
      message: "续订失败处理完成",
    };
  }

  /**
   * 处理续订状态变更通知
   * @private
   */
  async _handleRenewalStatusChange(notificationData) {
    console.log("🔄 处理续订状态变更通知");
    // 实现续订状态变更的业务逻辑
    return {
      type: "DID_CHANGE_RENEWAL_STATUS",
      message: "续订状态变更处理完成",
    };
  }

  /**
   * 处理价格上涨通知
   * @private
   */
  async _handlePriceIncrease(notificationData) {
    console.log("💰 处理价格上涨通知");
    // 实现价格上涨的业务逻辑
    return {
      type: "PRICE_INCREASE",
      message: "价格上涨处理完成",
    };
  }

  /**
   * 处理退款通知
   * @private
   */
  async _handleRefund(notificationData) {
    console.log("💸 处理退款通知");
    // 实现退款的业务逻辑
    return {
      type: "REFUND",
      message: "退款处理完成",
    };
  }

  /**
   * 处理降级通知
   * @private
   */
  async _handleDowngrade(notificationData) {
    console.log("⬇️ 处理降级通知");
    // 实现降级的业务逻辑
    return {
      type: "DOWNGRADE",
      message: "降级处理完成",
    };
  }

  /**
   * 处理升级通知
   * @private
   */
  async _handleUpgrade(notificationData) {
    console.log("⬆️ 处理升级通知");
    // 实现升级的业务逻辑
    return {
      type: "UPGRADE",
      message: "升级处理完成",
    };
  }

  /**
   * 记录事件日志
   * @private
   */
  async _logEvent(eventType, eventData) {
    try {
      const eventLog = new SubscriptionEventLog({
        eventType,
        eventData,
        timestamp: new Date(),
      });

      await eventLog.save();
      console.log(`📝 事件日志已记录: ${eventType}`);
    } catch (error) {
      console.error(`❌ 记录事件日志失败: ${eventType}`, error.message);
    }
  }
}

module.exports = new NotificationHandler();
