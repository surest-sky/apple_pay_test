const express = require("express");
const subscriptionService = require("../services/subscriptionService");
const {
  ResponseFormatter,
  ErrorHandler,
} = require("../utils/responseFormatter");

const router = express.Router();

/**
 * 获取用户订阅状态
 * GET /api/subscriptions/status/:userId
 */
router.get(
  "/status/:userId",
  ErrorHandler.asyncWrapper(async (req, res) => {
    const { userId } = req.params;

    console.log(`📊 API请求: 获取用户订阅状态 - ${userId}`);

    // 参数验证
    if (!userId || userId.trim() === "") {
      return ResponseFormatter.validationError(res, "用户ID不能为空");
    }

    // 调用业务逻辑服务
    const result = await subscriptionService.getUserSubscriptionStatus(userId);

    if (!result.success) {
      if (result.error === "USER_NOT_FOUND") {
        return ResponseFormatter.notFound(res, "用户");
      }

      if (result.error === "DATABASE_ERROR") {
        return ResponseFormatter.databaseError(res, new Error(result.message));
      }

      return ResponseFormatter.internalError(res, new Error(result.message));
    }

    return ResponseFormatter.success(res, result.data, "用户订阅状态获取成功");
  })
);

/**
 * 处理前端恢复购买通知
 * POST /api/subscriptions/handle-restored-purchase
 */
router.post(
  "/handle-restored-purchase",
  ErrorHandler.asyncWrapper(async (req, res) => {
    const {
      userId,
      productId,
      originalTransactionId,
      purchaseId,
      environment,
    } = req.body;

    console.log(`🔄 API请求: 处理恢复购买 - 用户=${userId}, 产品=${productId}`);

    // 参数验证
    const validationErrors = [];
    if (!userId) validationErrors.push("userId is required");
    if (!productId) validationErrors.push("productId is required");
    if (!originalTransactionId)
      validationErrors.push("originalTransactionId is required");

    if (validationErrors.length > 0) {
      return ResponseFormatter.validationError(res, validationErrors);
    }

    // 准备购买数据
    const purchaseData = {
      userId,
      productId,
      originalTransactionId,
      purchaseId,
      environment: environment || "Sandbox",
    };

    // 调用业务逻辑服务
    const result = await subscriptionService.handleRestoredPurchase(
      purchaseData
    );

    if (!result.success) {
      if (result.error === "RESTORE_PURCHASE_ERROR") {
        return ResponseFormatter.businessError(res, result.message);
      }

      return ResponseFormatter.internalError(res, new Error(result.message));
    }

    return ResponseFormatter.success(res, result.data, result.message);
  })
);

/**
 * 验证订阅状态（通过Apple API）
 * POST /api/subscriptions/verify/:originalTransactionId
 */
router.post(
  "/verify/:originalTransactionId",
  ErrorHandler.asyncWrapper(async (req, res) => {
    const { originalTransactionId } = req.params;

    console.log(`🔍 API请求: 验证订阅状态 - ${originalTransactionId}`);

    // 参数验证
    if (!originalTransactionId || originalTransactionId.trim() === "") {
      return ResponseFormatter.validationError(res, "原始交易ID不能为空");
    }

    // 调用业务逻辑服务
    const result = await subscriptionService.verifySubscriptionStatus(
      originalTransactionId
    );

    if (!result.success) {
      if (result.error === "APPLE_API_ERROR") {
        return ResponseFormatter.appleApiError(res, result.details);
      }

      if (result.error === "VERIFICATION_ERROR") {
        return ResponseFormatter.businessError(res, result.message);
      }

      return ResponseFormatter.internalError(res, new Error(result.message));
    }

    return ResponseFormatter.success(res, result.data, "订阅状态验证成功");
  })
);

module.exports = router;
