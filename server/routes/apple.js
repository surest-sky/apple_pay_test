const express = require("express");
const notificationHandler = require("../services/notificationHandler");
const appleApiService = require("../services/appleApiService");
const {
  ResponseFormatter,
  ErrorHandler,
} = require("../utils/responseFormatter");

const router = express.Router();

/**
 * Apple App Store Server Notifications webhook
 * POST /api/apple/notifications
 */
router.post(
  "/notifications",
  ErrorHandler.asyncWrapper(async (req, res) => {
    console.log("📨 收到Apple服务器通知");

    // 处理Apple服务器通知
    const result = await notificationHandler.handleAppleNotification(req.body);

    if (!result.success) {
      if (result.error === "DECODE_ERROR") {
        return ResponseFormatter.businessError(
          res,
          result.message,
          result.details
        );
      }

      if (result.error === "NOTIFICATION_PROCESSING_ERROR") {
        return ResponseFormatter.internalError(res, new Error(result.message));
      }

      return ResponseFormatter.internalError(res, new Error(result.message));
    }

    return ResponseFormatter.success(res, result.data, result.message);
  })
);

/**
 * 获取交易历史
 * GET /api/apple/transaction-history/:originalTransactionId
 */
router.get(
  "/transaction-history/:originalTransactionId",
  ErrorHandler.asyncWrapper(async (req, res) => {
    const { originalTransactionId } = req.params;

    console.log(`📊 API请求: 获取交易历史 - ${originalTransactionId}`);

    // 参数验证
    if (!originalTransactionId || originalTransactionId.trim() === "") {
      return ResponseFormatter.validationError(res, "原始交易ID不能为空");
    }

    // 调用Apple API服务
    const result = await appleApiService.getTransactionHistory(
      originalTransactionId
    );

    if (!result.success) {
      return ResponseFormatter.appleApiError(res, result.error);
    }

    return ResponseFormatter.success(res, result.data, "交易历史获取成功");
  })
);

/**
 * 获取订阅状态
 * GET /api/apple/subscription-status/:originalTransactionId
 */
router.get(
  "/subscription-status/:originalTransactionId",
  ErrorHandler.asyncWrapper(async (req, res) => {
    const { originalTransactionId } = req.params;

    console.log(`🔍 API请求: 获取订阅状态 - ${originalTransactionId}`);

    // 参数验证
    if (!originalTransactionId || originalTransactionId.trim() === "") {
      return ResponseFormatter.validationError(res, "原始交易ID不能为空");
    }

    // 调用Apple API服务
    const result = await appleApiService.getSubscriptionStatus(
      originalTransactionId
    );

    if (!result.success) {
      return ResponseFormatter.appleApiError(res, result.error);
    }

    return ResponseFormatter.success(res, result.data, "订阅状态获取成功");
  })
);

/**
 * 解码JWT载荷
 * POST /api/apple/decode-jwt
 */
router.post(
  "/decode-jwt",
  ErrorHandler.asyncWrapper(async (req, res) => {
    const { signedPayload } = req.body;

    console.log("🔓 API请求: 解码JWT载荷");

    // 参数验证
    if (!signedPayload || signedPayload.trim() === "") {
      return ResponseFormatter.validationError(res, "signedPayload不能为空");
    }

    // 调用Apple API服务
    const result = appleApiService.decodeJwtPayload(signedPayload);

    if (!result.success) {
      return ResponseFormatter.businessError(res, "JWT解码失败", result.error);
    }

    return ResponseFormatter.success(res, result.data, "JWT载荷解码成功");
  })
);

/**
 * 验证Apple API配置
 * GET /api/apple/config/validate
 */
router.get(
  "/config/validate",
  ErrorHandler.asyncWrapper(async (req, res) => {
    console.log("🔧 API请求: 验证Apple API配置");

    const result = appleApiService.validateConfig();

    if (!result.valid) {
      return ResponseFormatter.businessError(
        res,
        result.message,
        result.missingFields
      );
    }

    return ResponseFormatter.success(
      res,
      {
        environment: appleApiService.config.environment,
        issuerId: appleApiService.config.issuerId ? "已配置" : "未配置",
        keyId: appleApiService.config.keyId ? "已配置" : "未配置",
        privateKey: appleApiService.privateKey ? "已加载" : "未加载",
      },
      result.message
    );
  })
);

module.exports = router;
