当然可以！以下是将我们之前的对话内容系统整理成的一份**完整开发文档**，适用于 iOS 开发者在实现苹果支付（特别是订阅功能）时参考。

---

# 📄 苹果 App 内购买（In-App Purchase）开发指南

> 适用于自动续订订阅、非消耗型、消耗型商品的开发与管理

---

## 目录

1. [苹果支付核心概念](#1-苹果支付核心概念)
2. [四种商品类型详解](#2-四种商品类型详解)
3. [如何创建自动续订订阅？](#3-如何创建自动续订订阅)
4. [Server-to-Server 通知机制](#4-server-to-server-通知机制)
5. [恢复购买功能说明](#5-恢复购买功能说明)
6. [订阅状态管理最佳实践](#6-订阅状态管理最佳实践)
7. [常见问题与避坑指南](#7-常见问题与避坑指南)
8. [附录：推荐工具与接口](#附录推荐工具与接口)

---

## 1. 苹果支付核心概念

苹果的 **App 内购买（In-App Purchase, IAP）** 允许你在 App 中销售数字商品或服务。所有交易由苹果处理，开发者需遵守其规则。

主要商品类型分为四类：

| 类型                        | 中文名       | 是否自动续费   | 适用场景                       |
| --------------------------- | ------------ | -------------- | ------------------------------ |
| Consumable                  | 消耗型       | ❌             | 游戏金币、道具等一次性使用物品 |
| Non-Consumable              | 非消耗型     | ❌             | 去广告、永久解锁功能           |
| Non-Renewing Subscription   | 非续订订阅   | ❌（需手动续） | 不推荐使用                     |
| Auto-Renewable Subscription | 自动续订订阅 | ✅             | 会员服务、SaaS、内容访问       |

> ⚠️ 重点：**按月/年付费的服务必须使用“自动续订订阅”**，不能用“消耗型”或“非消耗型”模拟。

---

## 2. 四种商品类型详解

### 2.1 消耗型（Consumable）

- **定义**：购买后立即消耗，可重复购买。
- **示例**：游戏金币、钻石、体力
- **特点**：
  - 不可自动恢复（苹果不保留记录）
  - 必须由你服务器记录余额
  - 支持多次购买
- **开发注意**：
  - 成功购买后必须调用 `finishTransaction`
  - 需防止重复发放商品（通过交易 ID 去重）

---

### 2.2 非消耗型（Non-Consumable）

- **定义**：购买一次，永久拥有，支持跨设备恢复。
- **示例**：去广告、解锁关卡包
- **特点**：
  - 可通过“恢复购买”重新获取
  - 由 Apple ID 绑定，苹果管理购买记录
  - 永久有效
- **开发注意**：
  - 必须实现“恢复购买”按钮
  - 每次启动 App 建议验证收据确认状态

---

### 2.3 非续订订阅（Non-Renewing Subscription）

- **定义**：有效期固定，到期需手动续订。
- **示例**：一年期课程包（需每年重新买）
- **特点**：
  - 不自动续费
  - 需你自己实现用户登录和设备同步
- **⚠️ 不推荐使用**：管理复杂，体验差，容易被拒。

---

### 2.4 自动续订订阅（Auto-Renewable Subscription）

- **定义**：按周期自动扣费，用户可取消。
- **示例**：月度会员、年度会员
- **特点**：
  - 自动续费（每月/年）
  - 支持跨设备同步
  - 用户取消后仍可使用到周期结束
  - 苹果提供 Server-to-Server 通知
- **✅ 推荐用于所有持续性服务**

---

## 3. 如何创建自动续订订阅？

> ❗ 注意：**自动续订订阅不在“内购项目”中创建！**

### 步骤：

1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择你的 App
3. 左侧菜单 → **【功能】→【订阅】**
4. 点击 **【+】创建订阅组（Subscription Group）**
   - 一个订阅组代表一种服务（如“高级会员”）
   - 同一组内可包含月付、年付等套餐
5. 在订阅组中添加具体方案：
   - 名称（如“月度会员”）
   - 价格等级
   - 是否提供免费试用
   - 是否支持优惠价（Promotional Offer）
6. 提交审核（订阅需要单独审核）

### 示例 Product ID：

```
com.yourapp.premium.monthly
com.yourapp.premium.yearly
```

### 在代码中加载：

```swift
let productIDs: Set = ["com.yourapp.premium.monthly", "com.yourapp.premium.yearly"]
let request = SKProductsRequest(productIdentifiers: productIDs)
request.delegate = self
request.start()
```

---

## 4. Server-to-Server 通知机制

苹果会在订阅状态变化时，向你服务器发送实时通知。

### 4.1 配置方法

1. 进入 App Store Connect → 【功能】→【App 内购买项目】→【服务器通知】
2. 设置一个 HTTPS 回调 URL（如：`https://yourserver.com/apple-notifications`）

### 4.2 常见通知类型

| 类型                      | 含义                   |
| ------------------------- | ---------------------- |
| `INITIAL_BUY`             | 首次购买               |
| `DID_RENEW`               | 成功续订               |
| `DID_FAIL_TO_RENEW`       | 续订失败               |
| `CANCEL`                  | 用户取消订阅（或退款） |
| `DID_CHANGE_RENEWAL_PREF` | 更换套餐（如月换年）   |
| `INTERACTIVE_RENEWAL`     | 用户手动续订           |

### 4.3 服务器处理逻辑

1. 接收通知
2. 提取 `original_transaction_id`
3. 调用苹果收据验证接口，查询最新状态
4. 更新数据库中用户的订阅状态

> ⚠️ 注意：通知可能丢失，**不能仅依赖通知**，需结合定期对账。

---

## 5. 恢复购买功能说明

### 5.1 什么是“恢复购买”？

让用户在更换设备、重装 App 后，重新获取已购买的非消耗型商品或订阅。

### 5.2 支持类型

| 商品类型     | 是否支持恢复              |
| ------------ | ------------------------- |
| 非消耗型     | ✅ 是（苹果原生支持）     |
| 自动续订订阅 | ✅ 是（自动同步）         |
| 消耗型       | ❌ 否（需你自己同步数据） |

### 5.3 开发实现

#### 客户端（Swift）：

```swift
@IBAction func restorePurchases(_ sender: Any) {
    SKPaymentQueue.default().restoreCompletedTransactions()
}
```

监听回调：

```swift
func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
    for transaction in transactions {
        if transaction.transactionState == .restored {
            // 发送收据到服务器验证
            sendReceiptToServer()
        }
    }
}
```

#### 服务器端：

- 获取本地收据（`appStoreReceiptURL`）
- 发送到苹果验证接口
- 解析结果，确认是否有效

---

## 6. 订阅状态管理最佳实践

### 6.1 权威数据源：苹果收据

你的服务器不应自己存储“是否订阅”，而应通过以下方式验证：

- 使用收据验证接口：
  - 生产环境：`https://buy.itunes.apple.com/verifyReceipt`
  - 沙盒测试：`https://sandbox.itunes.apple.com/verifyReceipt`
- 返回字段重点关注：
  - `latest_receipt_info`：最新订阅记录
  - `pending_renewal_info`：续订状态
  - `expires_date`：过期时间

### 6.2 处理取消与宽限期

- 用户取消后，服务仍可用到**当前周期结束**
- 支付失败后，苹果会进入“宽限期”（Grace Period），期间仍视为有效
- 建议每天定时检查订阅状态（对账）

### 6.3 推荐架构

```
App Client
    ↓ (购买/恢复)
Your Server ←─── HTTPS ←─── Apple (Server-to-Server Notifications)
    ↓
Apple Receipt Validation API
    ↓
Update User Access Rights
```

---

## 7. 常见问题与避坑指南

| 问题                         | 正确做法                                 |
| ---------------------------- | ---------------------------------------- |
| “按月付费”该用哪种类型？     | ✅ 自动续订订阅                          |
| 能否用“非消耗型”模拟会员？   | ❌ 会被拒审                              |
| 用户换手机后买过的内容没了？ | ✅ 实现“恢复购买”+服务器验证             |
| 收不到订阅取消通知？         | ✅ 检查 URL 是否 HTTPS，是否有防火墙拦截 |
| 如何判断订阅是否过期？       | ✅ 查 `expires_date` 时间戳              |
| 能否退款后继续使用？         | ❌ 苹果退款后立即终止权限                |

---

## 8. 附录：推荐工具与接口

### 8.1 关键接口

| 功能                           | 接口地址                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 收据验证（旧）                 | `https://buy.itunes.apple.com/verifyReceipt`                                                         |
| App Store Server API（新推荐） | [https://api.storekit.itunes.apple.com](https://developer.apple.com/documentation/appstoreserverapi) |
| Server-to-Server 通知文档      | [Apple Docs](https://developer.apple.com/documentation/appstoreservernotifications)                  |

### 8.2 开发工具

- [Receipt Verification Tool](https://whatsthestatus.com/)（测试收据）
- Postman（测试通知接收）
- Xcode + Sandbox 测试账号（测试购买流程）

### 8.3 测试建议

- 使用 **沙盒测试账号** 进行购买测试
- 订阅周期在沙盒中会加速（几分钟 = 一个月）
- 所有通知都会发送到你的 URL（包括沙盒环境）

---

## 📞 如需帮助，可提供：

- Server-to-Server 通知解析代码（Node.js / Python）
- 收据验证后端实现
- Swift 客户端完整购买流程
- App Store Connect 截图指引

---

✅ **文档版本**：v1.0  
✅ **适用对象**：iOS 开发者、产品经理、后端工程师  
✅ **更新时间**：2025 年 4 月 5 日

---

📩 **获取方式**：你可以将此内容复制保存为 `.md` 或 `.docx` 文件，或打印为 PDF 使用。

如果你希望我导出为 **Markdown 文件** 或 **Word 文档**，也可以告诉我，我可以生成可下载的格式文本。

## 订阅状态

你提供的这些是苹果 App Store 服务器通知（Server-to-Server Notifications）中的 `notificationType` 枚举值。

当用户在 App Store 中执行了与订阅相关的操作时（如购买、续订、取消等），苹果的服务器会向你配置的服务器发送一个 JSON 格式的通知，其中的 `notificationType` 字段就是你列出的这些值，用于告诉你发生了什么事件。

下面是每个 `case` 的具体含义和通常需要执行的操作：

- **`SUBSCRIBED`**:

  - **含义**：用户首次购买了你的订阅产品。
  - **通常操作**：在你的数据库中创建一个新的用户订阅记录。记录订阅状态、起始日期和到期日期。

- **`DID_RENEW`**:

  - **含义**：用户订阅成功续期。
  - **通常操作**：更新数据库中现有订阅记录的到期日期，延长订阅有效期。

- **`DID_CHANGE_RENEWAL_PREF`**:

  - **含义**：用户在 App Store 中更改了订阅的续订偏好（例如，从月订阅切换到年订阅，或者更改了订阅等级）。
  - **通常操作**：更新数据库中订阅的 `product_id` 或其他相关信息，以反映用户的新选择。

- **`DID_CHANGE_RENEWAL_STATUS`**:

  - **含义**：用户在 App Store 中打开或关闭了自动续订。
  - **通常操作**：更新数据库中订阅的自动续订状态。当状态为 `OFF` 时，你可能需要显示相应的提示。

- **`EXPIRED`**:

  - **含义**：订阅已过期，通常是由于用户关闭了自动续订且未再次购买，或者续订失败。
  - **通常操作**：更新数据库中订阅的状态为“过期”，并限制用户对付费内容的访问。

- **`DID_FAIL_TO_RENEW`**:

  - **含义**：订阅自动续订失败，通常是由于付款问题（如信用卡过期或余额不足）。苹果会重试一段时间。
  - **通常操作**：更新数据库中订阅状态为“续订失败”，可能需要向用户发送通知，提醒他们更新支付信息。

- **`DID_RECOVER`**:

  - **含义**：在 `DID_FAIL_TO_RENEW` 状态下，用户解决了支付问题，订阅成功恢复。
  - **通常操作**：更新数据库中订阅状态为“已恢复”，并更新到期日期。

- **`PRICE_INCREASE`**:

  - **含义**：苹果增加了订阅的价格，并且用户必须同意这个价格变动。
  - **通常操作**：通常不需要立即处理，但在订阅续期时，你需要检查用户是否同意了新价格。

- **`REFUND`**:

  - **含义**：用户获得了退款。
  - **通常操作**：更新数据库中订阅状态为“已退款”，并撤销用户对付费内容的访问权限。

- **`REFUND_DECLINED`**:

  - **含义**：用户的退款申请被拒绝。
  - **通常操作**：通常不需要特殊处理，因为订阅状态会保持不变。

- **`CONSUMPTION_REQUEST`**:

  - **含义**：用户购买了可消耗性内购产品（non-renewing, like buying coins）。
  - **通常操作**：确认用户购买并为其提供相应的内购内容（例如，增加游戏币数量）。

- **`RENEWAL_EXTENDED`**:

  - **含义**：苹果延长了订阅的到期日，通常是为了补偿或在维护期间。
  - **通常操作**：更新数据库中订阅的到期日期。

- **`REVOKE`**:

  - **含义**：苹果撤销了用户的订阅权限，通常是由于欺诈或违反条款。
  - **通常操作**：立即更新数据库中订阅状态为“已撤销”，并撤销用户访问权限。

- **`TEST`**:
  - **含义**：测试通知，通常用于在开发或沙盒环境中验证你的服务器是否能正确接收和处理通知。
  - **通常操作**：记录通知以确认你的服务器工作正常，但不要进行任何实际的订阅状态更改。

这些通知对于维护你应用内订阅的最新状态至关重要，是保证付费内容安全和准确的关键。
