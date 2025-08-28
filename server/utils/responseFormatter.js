/**
 * 响应格式化工具
 *
 * 职责：
 * - 统一API响应格式
 * - 标准化错误响应
 * - 提供常用的响应模板
 */
class ResponseFormatter {
  /**
   * 成功响应
   * @param {Object} res - Express响应对象
   * @param {Object} data - 响应数据
   * @param {string} message - 成功消息
   * @param {number} statusCode - HTTP状态码
   */
  static success(res, data = null, message = "操作成功", statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 错误响应
   * @param {Object} res - Express响应对象
   * @param {string} error - 错误代码
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {Object} details - 错误详情
   */
  static error(
    res,
    error = "UNKNOWN_ERROR",
    message = "操作失败",
    statusCode = 500,
    details = null
  ) {
    const response = {
      success: false,
      error,
      message,
      timestamp: new Date().toISOString(),
    };

    if (details !== null) {
      response.details = details;
    }

    console.error(
      `❌ API错误 [${statusCode}] ${error}: ${message}`,
      details || ""
    );

    return res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   * @param {Object} res - Express响应对象
   * @param {Array|Object} validationErrors - 验证错误
   */
  static validationError(res, validationErrors) {
    return this.error(
      res,
      "VALIDATION_ERROR",
      "请求参数验证失败",
      400,
      validationErrors
    );
  }

  /**
   * 未找到资源响应
   * @param {Object} res - Express响应对象
   * @param {string} resource - 资源名称
   */
  static notFound(res, resource = "资源") {
    return this.error(res, "RESOURCE_NOT_FOUND", `${resource}未找到`, 404);
  }

  /**
   * 未授权响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static unauthorized(res, message = "未授权访问") {
    return this.error(res, "UNAUTHORIZED", message, 401);
  }

  /**
   * 禁止访问响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static forbidden(res, message = "禁止访问") {
    return this.error(res, "FORBIDDEN", message, 403);
  }

  /**
   * 冲突响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   */
  static conflict(res, message = "资源冲突") {
    return this.error(res, "CONFLICT", message, 409);
  }

  /**
   * 服务器内部错误响应
   * @param {Object} res - Express响应对象
   * @param {Error} err - 错误对象
   */
  static internalError(res, err = null) {
    const message = err?.message || "服务器内部错误";
    const details = process.env.NODE_ENV === "development" ? err?.stack : null;

    return this.error(res, "INTERNAL_SERVER_ERROR", message, 500, details);
  }

  /**
   * 苹果API错误响应
   * @param {Object} res - Express响应对象
   * @param {Object} appleError - 苹果API错误
   */
  static appleApiError(res, appleError) {
    return this.error(
      res,
      "APPLE_API_ERROR",
      "苹果API调用失败",
      502,
      appleError
    );
  }

  /**
   * 数据库错误响应
   * @param {Object} res - Express响应对象
   * @param {Error} dbError - 数据库错误
   */
  static databaseError(res, dbError) {
    const message = "数据库操作失败";
    const details =
      process.env.NODE_ENV === "development" ? dbError?.message : null;

    return this.error(res, "DATABASE_ERROR", message, 500, details);
  }

  /**
   * 业务逻辑错误响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 业务错误消息
   * @param {Object} details - 错误详情
   */
  static businessError(res, message, details = null) {
    return this.error(res, "BUSINESS_ERROR", message, 400, details);
  }
}

/**
 * 错误处理中间件
 */
class ErrorHandler {
  /**
   * 全局错误处理中间件
   * @param {Error} err - 错误对象
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件
   */
  static globalErrorHandler(err, req, res, next) {
    console.error("🚨 全局错误捕获:", err);

    // 如果响应已经发送，交给Express默认错误处理
    if (res.headersSent) {
      return next(err);
    }

    // 根据错误类型返回相应的响应
    if (err.name === "ValidationError") {
      return ResponseFormatter.validationError(res, err.errors);
    }

    if (err.name === "CastError") {
      return ResponseFormatter.validationError(res, "无效的ID格式");
    }

    if (err.code === 11000) {
      return ResponseFormatter.conflict(res, "数据已存在");
    }

    // 默认服务器内部错误
    return ResponseFormatter.internalError(res, err);
  }

  /**
   * 404错误处理中间件
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件
   */
  static notFoundHandler(req, res, next) {
    return ResponseFormatter.notFound(res, `路径 ${req.originalUrl}`);
  }

  /**
   * 异步错误包装器
   * @param {Function} fn - 异步函数
   * @returns {Function} 包装后的函数
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = {
  ResponseFormatter,
  ErrorHandler,
};
