const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

/**
 * 苹果API服务 - 专门处理与Apple App Store Server API的交互
 *
 * 职责：
 * - 生成JWT认证令牌
 * - 调用Apple API获取交易历史
 * - 调用Apple API获取订阅状态
 * - 解码JWT载荷
 */
class AppleApiService {
  constructor() {
    this.config = {
      issuerId: process.env.APPLE_ISSUER_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH,
      sharedSecret: process.env.APPLE_SHARED_SECRET,
      environment: process.env.APPLE_ENVIRONMENT || "sandbox",
    };

    this.privateKey = this._loadPrivateKey();
    this.baseUrl = this._getBaseUrl();
  }

  /**
   * 加载苹果私钥
   * @private
   */
  _loadPrivateKey() {
    if (
      !this.config.privateKeyPath ||
      !fs.existsSync(this.config.privateKeyPath)
    ) {
      throw new Error("Apple private key not found");
    }
    return fs.readFileSync(this.config.privateKeyPath, "utf8");
  }

  /**
   * 获取API基础URL
   * @private
   */
  _getBaseUrl() {
    return this.config.environment === "production"
      ? "https://api.storekit.itunes.apple.com"
      : "https://api.storekit-sandbox.itunes.apple.com";
  }

  /**
   * 生成JWT认证令牌
   * @returns {string} JWT令牌
   */
  generateAuthToken() {
    if (!this.privateKey) {
      throw new Error("Apple private key not loaded");
    }

    const payload = {
      iss: this.config.issuerId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1小时过期
      aud: "appstoreconnect-v1",
      bid: process.env.APPLE_BUNDLE_ID,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: "ES256",
      keyid: this.config.keyId,
    });
  }

  /**
   * 获取API请求头
   * @private
   */
  _getHeaders() {
    return {
      Authorization: `Bearer ${this.generateAuthToken()}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * 获取交易历史
   * @param {string} originalTransactionId - 原始交易ID
   * @returns {Promise<Object>} 交易历史数据
   */
  async getTransactionHistory(originalTransactionId) {
    try {
      console.log(`📊 获取交易历史: ${originalTransactionId}`);

      const url = `${this.baseUrl}/inApps/v1/history/${originalTransactionId}`;
      const response = await axios.get(url, { headers: this._getHeaders() });

      console.log(`✅ 交易历史获取成功: ${originalTransactionId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        `❌ 获取交易历史失败: ${originalTransactionId}`,
        error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * 获取订阅状态
   * @param {string} originalTransactionId - 原始交易ID
   * @returns {Promise<Object>} 订阅状态数据
   */
  async getSubscriptionStatus(originalTransactionId) {
    try {
      console.log(`🔍 获取订阅状态: ${originalTransactionId}`);

      const url = `${this.baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`;
      const response = await axios.get(url, { headers: this._getHeaders() });

      console.log(`✅ 订阅状态获取成功: ${originalTransactionId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        `❌ 获取订阅状态失败: ${originalTransactionId}`,
        error.message
      );
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * 解码JWT载荷
   * @param {string} signedPayload - 签名的JWT载荷
   * @returns {Object} 解码后的数据
   */
  decodeJwtPayload(signedPayload) {
    try {
      console.log("🔓 解码JWT载荷");

      // 分割JWT获取载荷部分
      const parts = signedPayload.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Base64解码载荷
      const payload = parts[1];
      const decodedPayload = Buffer.from(payload, "base64").toString("utf8");
      const parsedPayload = JSON.parse(decodedPayload);

      console.log("✅ JWT载荷解码成功");
      return {
        success: true,
        data: parsedPayload,
      };
    } catch (error) {
      console.error("❌ JWT载荷解码失败:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 验证配置是否完整
   * @returns {Object} 验证结果
   */
  validateConfig() {
    const requiredFields = ["issuerId", "keyId", "privateKeyPath"];

    const missingFields = requiredFields.filter((field) => !this.config[field]);

    if (missingFields.length > 0) {
      return {
        valid: false,
        missingFields,
        message: `Missing required configuration: ${missingFields.join(", ")}`,
      };
    }

    if (!this.privateKey) {
      return {
        valid: false,
        message: "Apple private key could not be loaded",
      };
    }

    return {
      valid: true,
      message: "Apple API configuration is valid",
    };
  }
}

module.exports = new AppleApiService();
