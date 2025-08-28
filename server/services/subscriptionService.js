const { User, Subscription } = require("../models");
const appleApiService = require("./appleApiService");

/**
 * 订阅业务逻辑服务
 *
 * 职责：
 * - 管理用户订阅状态
 * - 处理恢复购买逻辑
 * - 更新订阅信息
 * - 验证订阅状态
 */
class SubscriptionBusinessService {
  /**
   * 获取用户订阅状态
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户订阅信息
   */
  async getUserSubscriptionStatus(userId) {
    try {
      console.log(`👤 获取用户订阅状态: ${userId}`);

      const user = await User.findOne({ userId: userId });

      if (!user) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "用户未找到",
        };
      }

      console.log(`✅ 用户订阅状态获取成功: ${userId}`);
      return {
        success: true,
        data: {
          userId: user.userId,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionType: user.subscriptionType,
          subscriptionExpiryDate: user.subscriptionExpiryDate,
          lastVerifiedAt: user.lastVerifiedAt,
        },
      };
    } catch (error) {
      console.error(`❌ 获取用户订阅状态失败: ${userId}`, error.message);
      return {
        success: false,
        error: "DATABASE_ERROR",
        message: error.message,
      };
    }
  }

  /**
   * 处理恢复购买
   * @param {Object} purchaseData - 购买数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleRestoredPurchase(purchaseData) {
    const {
      userId,
      productId,
      originalTransactionId,
      purchaseId,
      environment = "Sandbox",
    } = purchaseData;

    try {
      console.log(`🔄 处理恢复购买: 用户=${userId}, 产品=${productId}`);

      // 映射产品类型
      const subscriptionType = this._mapProductIdToSubscriptionType(productId);

      // 查找或创建用户
      const user = await this._findOrCreateUser(userId, subscriptionType);

      // 查找或创建订阅记录
      const subscription = await this._findOrCreateSubscription({
        userId,
        productId,
        originalTransactionId,
        purchaseId,
        subscriptionType,
      });

      console.log(`✅ 恢复购买处理成功: ${userId}`);
      return {
        success: true,
        message: "已处理恢复购买通知，订阅状态已更新为待验证",
        data: {
          user: this._formatUserData(user),
          subscription: this._formatSubscriptionData(subscription),
        },
      };
    } catch (error) {
      console.error(`❌ 处理恢复购买失败: ${userId}`, error.message);
      return {
        success: false,
        error: "RESTORE_PURCHASE_ERROR",
        message: error.message,
      };
    }
  }

  /**
   * 验证订阅状态（通过Apple API）
   * @param {string} originalTransactionId - 原始交易ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifySubscriptionStatus(originalTransactionId) {
    try {
      console.log(`🔍 验证订阅状态: ${originalTransactionId}`);

      const result = await appleApiService.getSubscriptionStatus(
        originalTransactionId
      );

      if (!result.success) {
        return {
          success: false,
          error: "APPLE_API_ERROR",
          message: "苹果API调用失败",
          details: result.error,
        };
      }

      const subscriptionStatus = this._parseSubscriptionStatus(result.data);

      console.log(`✅ 订阅状态验证完成: ${originalTransactionId}`);
      return {
        success: true,
        data: subscriptionStatus,
      };
    } catch (error) {
      console.error(
        `❌ 订阅状态验证失败: ${originalTransactionId}`,
        error.message
      );
      return {
        success: false,
        error: "VERIFICATION_ERROR",
        message: error.message,
      };
    }
  }

  /**
   * 映射产品ID到订阅类型
   * @private
   */
  _mapProductIdToSubscriptionType(productId) {
    const productMapping = {
      month: "monthly",
      quarter: "quarterly",
      year: "yearly",
      // 添加其他产品ID映射
    };

    return productMapping[productId] || "unknown";
  }

  /**
   * 查找或创建用户
   * @private
   */
  async _findOrCreateUser(userId, subscriptionType) {
    let user = await User.findOne({ userId: userId });

    if (!user) {
      console.log(`👤 创建新用户: ${userId}`);
      user = new User({
        userId: userId,
        subscriptionStatus: "pending_verification",
        subscriptionType: subscriptionType,
        lastVerifiedAt: new Date(),
      });
    } else {
      console.log(`👤 更新现有用户: ${userId}`);
      user.subscriptionStatus = "pending_verification";
      user.subscriptionType = subscriptionType;
      user.lastVerifiedAt = new Date();
    }

    return await user.save();
  }

  /**
   * 查找或创建订阅记录
   * @private
   */
  async _findOrCreateSubscription(data) {
    const {
      userId,
      productId,
      originalTransactionId,
      purchaseId,
      subscriptionType,
    } = data;

    let subscription = await Subscription.findOne({
      userId: userId,
      productId: productId,
    });

    if (!subscription) {
      console.log(`📝 创建新订阅记录: ${userId} - ${productId}`);
      subscription = new Subscription({
        userId: userId,
        productId: productId,
        subscriptionType: subscriptionType,
        status: "pending_verification",
        originalTransactionId: originalTransactionId,
        purchaseId: purchaseId,
        restoredAt: new Date(),
      });
    } else {
      console.log(`📝 更新现有订阅记录: ${userId} - ${productId}`);
      subscription.status = "pending_verification";
      subscription.originalTransactionId = originalTransactionId;
      subscription.restoredAt = new Date();
    }

    return await subscription.save();
  }

  /**
   * 解析苹果API返回的订阅状态
   * @private
   */
  _parseSubscriptionStatus(appleData) {
    // 这里需要根据Apple API的实际返回格式来解析
    // 这是一个简化的示例
    return {
      status: appleData.status || "unknown",
      expiryDate: appleData.expires_date || null,
      autoRenewStatus: appleData.auto_renew_status || false,
      // 添加其他需要的字段
    };
  }

  /**
   * 格式化用户数据
   * @private
   */
  _formatUserData(user) {
    return {
      userId: user.userId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionType: user.subscriptionType,
      lastVerifiedAt: user.lastVerifiedAt,
    };
  }

  /**
   * 格式化订阅数据
   * @private
   */
  _formatSubscriptionData(subscription) {
    return {
      id: subscription._id,
      productId: subscription.productId,
      subscriptionType: subscription.subscriptionType,
      status: subscription.status,
      originalTransactionId: subscription.originalTransactionId,
    };
  }
}

module.exports = new SubscriptionBusinessService();
