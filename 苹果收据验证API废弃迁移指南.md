# 苹果收据验证 API 废弃迁移指南

## 概述

苹果已于 2024 年 6 月正式废弃了 `verifyReceipt` API，并推荐开发者迁移到新的 **App Store Server API**。本指南说明了我们在项目中所做的相关更改。

## 废弃的功能

### 后端 (Node.js)

#### 已移除的函数 (`server/utils/appleUtils.js`)

- ❌ `verifyReceiptWithApple()` - 使用废弃的 verifyReceipt API
- ❌ `parseReceiptData()` - 解析废弃 API 的响应数据
- ❌ `isSubscriptionActive()` - 基于废弃 API 数据判断订阅状态

#### 已移除的路由端点

- ❌ `POST /api/subscriptions/verify` - 验证收据
- ❌ `POST /api/subscriptions/refresh/:userId` - 刷新订阅状态
- ❌ `POST /api/subscriptions/verify-restored-purchase` - 验证恢复购买
- ❌ `POST /api/apple/verify-receipt` - 验证收据（备用端点）

### 前端 (Flutter)

#### 已移除的函数 (`lib/services/api_service.dart`)

- ❌ `verifyRestoredPurchase()` - 调用废弃的收据验证 API

#### 已移除的函数 (`lib/services/subscription_service.dart`)

- ❌ `_verifyReceiptWithBackend()` - 后端收据验证

## 保留的功能

### 后端 - 现代化的 App Store Server API

#### 保留的函数 (`server/utils/appleUtils.js`)

- ✅ `getTransactionHistory()` - 获取交易历史
- ✅ `getSubscriptionStatus()` - 获取订阅状态
- ✅ `getAppleApiToken()` - 生成 API 认证令牌
- ✅ `decodeJwtPayload()` - 解码 JWT 载荷
- ✅ `verifyAndDecodeAppleJwt()` - 验证和解码苹果 JWT

#### 保留的路由端点

- ✅ `GET /api/subscriptions/status/:userId` - 获取用户订阅状态
- ✅ `POST /api/subscriptions/handle-restored-purchase` - 处理恢复购买通知
- ✅ `POST /api/apple/notifications-v2` - 苹果服务器通知 v2
- ✅ `GET /api/apple/transaction-history/:originalTransactionId` - 获取交易历史
- ✅ `GET /api/apple/subscription-status/:originalTransactionId` - 获取订阅状态

### 前端 - 优化的购买流程

#### 保留的功能

- ✅ 恢复购买检测和后端通知
- ✅ 购买状态统计和摘要显示
- ✅ 重复交易去重处理
- ✅ 错误处理和重试机制

## 新的推荐流程

### 1. 订阅验证流程

**旧流程（已废弃）:**

```
前端获取收据 → 发送到后端 → 调用verifyReceipt API → 解析响应 → 更新数据库
```

**新流程（推荐）:**

```
苹果服务器通知 → 后端接收通知 → 解析JWT载荷 → 更新数据库
或者
前端通知后端 → 后端调用App Store Server API → 获取最新状态 → 更新数据库
```

### 2. 恢复购买流程

**新流程:**

```
前端检测restored状态 → 通知后端 → 后端记录待验证状态 →
苹果服务器通知确认 → 更新为最终状态
```

## 迁移的优势

### 1. **更可靠的数据同步**

- 直接接收苹果服务器通知，无需依赖客户端
- 实时状态更新，减少数据不一致

### 2. **更好的安全性**

- 服务器到服务器的通信更安全
- JWT 签名验证确保数据完整性

### 3. **更丰富的数据**

- 获取完整的交易历史
- 详细的订阅状态信息
- 支持更多订阅事件类型

### 4. **更好的性能**

- 减少客户端到服务器的请求
- 异步处理，不阻塞用户操作

## 环境变量配置

确保以下环境变量已正确配置：

```env
# App Store Connect API
APPLE_ISSUER_ID=your_issuer_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY_PATH=path/to/private/key.p8
APPLE_ENVIRONMENT=sandbox  # 或 production

# 废弃的配置（可以移除）
# APPLE_SHARED_SECRET=your_shared_secret
```

## 测试建议

### 1. **功能测试**

- 测试新的恢复购买流程
- 验证苹果服务器通知处理
- 检查订阅状态查询

### 2. **性能测试**

- 监控 API 响应时间
- 检查数据库查询效率
- 验证错误处理机制

### 3. **集成测试**

- 测试前后端数据一致性
- 验证不同设备间的同步
- 检查网络异常处理

## 故障排除

### 常见问题

1. **API 认证失败**

   - 检查私钥文件路径和权限
   - 验证 Issuer ID 和 Key ID 配置
   - 确认 JWT 令牌生成正确

2. **找不到交易记录**

   - 确认 originalTransactionId 正确
   - 检查环境配置（sandbox vs production）
   - 验证产品 ID 匹配

3. **通知处理失败**
   - 检查 JWT 解码逻辑
   - 验证数据库模型字段
   - 确认错误处理流程

## 后续计划

1. **监控和日志**

   - 添加详细的 API 调用日志
   - 监控错误率和响应时间
   - 设置告警机制

2. **功能增强**

   - 实现完整的 JWT 签名验证
   - 添加更多订阅事件处理
   - 优化数据库查询性能

3. **文档更新**
   - 更新 API 文档
   - 完善错误代码说明
   - 提供更多使用示例

## 总结

通过移除废弃的 `verifyReceipt` API 相关代码，我们的应用现在：

- ✅ **符合苹果最新要求** - 使用推荐的 App Store Server API
- ✅ **提高了可靠性** - 减少了对废弃 API 的依赖
- ✅ **改善了性能** - 优化了购买流程和错误处理
- ✅ **增强了安全性** - 使用更安全的服务器通信方式

这些更改确保了应用的长期可维护性和与苹果生态系统的兼容性。
