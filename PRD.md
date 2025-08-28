# 订阅产品界面与支付功能开发记录

## 功能概述

本次开发实现了订阅产品的界面展示和 Apple Pay 支付功能，包括：

1. 订阅产品展示界面
2. 支持多种订阅计划（月度、年度、季度）
3. Apple Pay 支付功能集成
4. 恢复购买功能

## 技术实现

### 依赖添加

在 `pubspec.yaml` 中添加了 `in_app_purchase: ^3.1.11` 依赖用于处理应用内购买。

### 核心文件

#### 1. 常量定义 (`lib/constants/product_ids.dart`)

- 创建了 `ProductIds` 类来集中管理所有产品 ID
- 避免了硬编码，提高了代码的可维护性

#### 2. 数据模型 (`lib/models/subscription_product.dart`)

- 创建了 `SubscriptionProduct` 类来表示订阅产品
- 包含产品 ID、标题、描述、价格、周期等属性
- 提供了示例数据用于展示

#### 3. 服务层 (`lib/services/subscription_service.dart`)

- 封装了订阅服务逻辑
- 集成了 `in_app_purchase` 插件
- 处理产品查询、购买流程、恢复购买等功能
- 实现了购买状态监听和回调处理
- 使用正确的订阅购买方法 `buyNonConsumable`（对于自动续订订阅）

#### 4. 界面层 (`lib/screens/subscription_page.dart`)

- 创建了订阅产品展示页面
- 实现了美观的产品卡片展示
- 添加了推荐标识和差异化样式
- 集成了购买和恢复购买功能按钮

#### 5. 应用入口 (`lib/main.dart`)

- 修改了应用入口，将订阅页面设为主页面

### 功能特性

#### 订阅产品展示

- 三种订阅计划：月度、年度、季度
- 年度计划标记为"推荐"并有特殊样式
- 清晰展示价格和订阅周期
- 响应式设计，适配不同屏幕尺寸

#### 支付功能

- 集成 Apple Pay 支付
- 支持多种订阅计划购买
- 购买流程状态提示（处理中、成功、失败）
- 错误处理和用户友好的提示信息

#### 恢复购买

- 提供恢复购买功能（iOS 平台）
- 处理恢复购买的回调和状态更新

## 问题解决记录

### 产品未找到问题

**问题描述：** 应用提示"未找到以下产品: com.dotdotbear.kwh.monthly, com.dotdotbear.kwh.yearly, com.dotdotbear.kwh.quarterly"

**解决方案：**

1. 确认代码中的产品 ID 与 App Store Connect 中配置的产品 ID 完全一致
2. 创建了详细的 App Store Connect 配置指南，指导完成订阅产品的创建和配置
3. 更新了服务层代码，使用正确的订阅购买方法

### 代码重构

**问题描述：** 代码中多处硬编码了产品 ID，维护困难

**解决方案：**

1. 创建了常量文件 `lib/constants/product_ids.dart` 集中管理所有产品 ID
2. 将所有硬编码的产品 ID 替换为常量引用
3. 提高了代码的可维护性和一致性

### 支付取消处理问题

**问题描述：** 当用户选择购买产品并弹出 Apple Pay 支付界面后，如果用户关闭支付界面，应用仍然显示"正在处理购买"状态，没有正确处理用户取消支付的情况。

**进一步分析：** 经过测试发现，当用户取消购买时，系统会抛出一个 `PlatformException` 异常，而不是通过正常的 `PurchaseStatus.canceled` 状态来通知应用。异常的错误代码是 `storekit2_purchase_cancelled`，表示用户取消了交易。

**解决方案：**

1. 在 `SubscriptionService` 中添加了对用户取消购买情况的全面处理：

   - 添加了 `_isPurchaseCancelledError` 方法来识别用户取消购买的异常
   - 在 `init` 方法的 `onError` 回调中添加了对取消异常的处理
   - 在 `_handlePurchaseUpdates` 方法中增加了对 `PurchaseStatus.error` 状态下取消异常的检查
   - 在 `purchaseProduct` 方法中添加了 try-catch 块来捕获购买过程中可能发生的异常
   - 保留了对 `PurchaseStatus.canceled` 状态的处理，以确保兼容性

2. 在 `SubscriptionPage` 中实现了用户取消支付后的 UI 更新逻辑：

   - 添加了 `_showCancelDialog` 方法来显示取消购买的提示对话框
   - 在 `_purchaseProduct` 方法中增加了异常处理机制
   - 当用户取消支付时，正确更新界面状态并显示相应消息

3. 更新了 PRD 文档，记录了这个问题的详细解决过程

### 支付界面未弹出问题

**问题描述：** 在某些情况下，应用会一直显示"正在处理购买"的转圈圈状态，但支付框没有弹出来。

**分析与解决方案：**

1. 发现问题可能出现在异常处理流程中，当购买过程中发生异常时，没有正确地将加载状态重置为完成状态。
2. 修改了 `SubscriptionService` 中的 `purchaseProduct` 方法，确保即使在发生非取消购买的异常时，也能通过 `onPurchaseError` 回调通知页面更新 UI 状态。
3. 确保在所有可能的执行路径中都能正确地处理加载状态，避免 UI 卡在加载状态。

### 重复订阅处理问题

**问题描述：** 当用户已经订阅了某个产品，然后重新点击订阅按钮时，系统会尝试再次发起购买流程，这可能会导致用户体验不佳。

**进一步分析：** 经过进一步分析发现，前端不能直接判断用户是否已经购买过某个产品，需要通过查询用户的购买历史记录来获取这个信息。通过查看 `in_app_purchase` 插件的文档，我们发现应该使用 `purchaseStream` 来监听用户的购买更新，包括历史购买记录和新的购买事件。

**解决方案：**

1. 在 `SubscriptionService` 中通过 `purchaseStream` 监听用户的购买更新：

   - 在 `init` 方法中设置对 `purchaseStream` 的监听
   - 在 `_handlePurchaseUpdates` 方法中处理购买更新，将成功购买的产品添加到已购买产品集合中
   - 添加了 `isProductPurchased` 方法来检查产品是否已购买
   - 在 `purchaseProduct` 方法中添加了重复购买检查，如果产品已购买则直接返回并显示提示信息

2. 在 `SubscriptionPage` 中实现了重复订阅的处理逻辑：
   - 添加了 `onProductAlreadyOwned` 回调来处理已拥有产品的情况
   - 添加了 `_showInfoDialog` 方法来显示信息提示对话框
   - 更新了产品卡片组件，使其能够根据产品的购买状态来：
     - 禁用已购买产品的订阅按钮
     - 更改已购买产品的按钮文本为"已订阅"
     - 更改已购买产品的按钮样式为灰色
   - 在产品列表构建时传递产品的购买状态

通过以上修改，应用能够正确地识别用户已经购买的产品，并在用户尝试重复购买时给出相应提示，避免不必要的购买流程。

需要注意的是，在生产环境中，还应该实现服务端收据验证以确保购买安全性，这比仅仅依赖客户端的购买状态检查更加可靠。

## 测试情况

- 代码通过了 Flutter 静态分析，无严重错误
- 由于缺少实际设备，未进行真机测试验证
- 功能逻辑已按 Apple Pay 最佳实践实现

## 后端服务

目录在当前目录的 server 目录下

本项目包含一个完整的 Node.js 后端服务，用于处理：

1. Apple Pay 订阅收据验证
2. 用户订阅状态管理
3. Apple App Store 服务器通知处理（支持 v1 和 v2 通知格式）
4. 用户和订阅数据存储
5. 订阅事件日志记录

后端服务使用 MongoDB 作为数据库，并实现了与 Apple App Store Server API 的集成。

### 订阅管理

后端服务实现了完整的订阅生命周期管理，包括：

1. **订阅创建** - 处理用户的初始订阅购买
2. **订阅续订** - 自动处理周期性续订
3. **订阅取消** - 处理用户取消自动续订
4. **订阅过期** - 处理订阅到期情况
5. **退款处理** - 处理用户退款请求
6. **状态跟踪** - 跟踪订阅的所有状态变化
7. **混合会员处理** - 处理用户已有赠送会员再购买订阅的情况

#### 混合会员处理机制

当用户已经拥有赠送会员时再购买订阅，系统采用以下处理机制：

1. **时间叠加策略**：新订阅的会员时间在现有会员时间基础上继续延长

   - 例如：用户有 35 天赠送会员（7 月 28 日到 9 月 1 日），在 8 月 1 日购买 1 个月订阅
   - 订阅生效时间：9 月 1 日（赠送会员结束后）
   - 订阅到期时间：10 月 1 日（订阅生效后 1 个月）

2. **状态区分**：系统能够区分和管理不同类型的会员资格

   - 赠送会员状态
   - 购买订阅状态
   - 当前生效的会员状态

3. **透明展示**：向用户清晰展示会员构成和到期时间

### 订阅状态

订阅可以处于以下状态：

- `active` - 活跃订阅
- `expired` - 订阅已过期
- `cancelled` - 用户已取消自动续订
- `grace_period` - 宽限期内（续订失败但仍可访问）
- `refunded` - 已退款

### Apple 通知处理

后端服务能够处理 Apple 发送的两种通知格式：

1. **v1 通知格式** - 包含 `notification_type` 字段
2. **v2 通知格式** - 包含 `signedPayload` 字段，需要解码 JWT token

对于包含 `signedPayload` 的通知，后端服务会：

1. 解析 JWT token 的 payload 部分
2. Base64 解码 payload 获取实际的 JSON 数据
3. 提取通知类型、交易 ID、产品 ID 等信息
4. 存储原始通知数据到数据库
5. 根据通知类型更新用户订阅状态

对于 v2 通知中的 `signedTransactionInfo` 和 `signedRenewalInfo` 字段：

1. 这些字段也是 JWT tokens，需要单独解码
2. 解码后可以获取交易详情和续订信息
3. 使用这些信息更新用户订阅状态

支持的通知类型包括：

- SUBSCRIBED - 用户订阅
- DID_RENEW - 订阅续订成功
- DID_CHANGE_RENEWAL_PREF - 用户更改续订偏好
- DID_CHANGE_RENEWAL_STATUS - 用户更改续订状态
- EXPIRED - 订阅过期
- DID_FAIL_TO_RENEW - 续订失败
- DID_RECOVER - 订阅恢复
- REFUND - 退款
- REVOKE - 撤销订阅
- PRICE_INCREASE - 价格上涨

### API 端点

主要 API 端点：

- `POST /api/subscriptions/verify` - 验证订阅收据
- `GET /api/subscriptions/status/:userId` - 获取用户订阅状态
- `POST /api/apple/notifications` - Apple 通知 webhook (v1)
- `POST /api/apple/notifications-v2` - Apple 通知 webhook (v2)
- `POST /api/apple/test-user` - 创建测试用户
- `GET /api/apple/test-user/status` - 获取测试用户订阅状态
- `GET /api/apple/test-user/events` - 获取测试用户订阅事件日志

### 测试流程

- 首次购买订阅 （按月） 是否订阅成功
- 首次购买订阅 （按季） 是否订阅成功
- 首次购买订阅 （按年） 是否订阅成功
- 续费 （月） 是否续费成功
- 续费 （年） 是否续费成功
- 续费 （季） 是否续费成功
- 升级 （月升级年） 是否续费成功
- 降级 （年降级月） 是否处理正确
- 取消自动续订 是否处理正确
- 订阅过期 是否处理正确
- 续订失败但处于宽限期 是否处理正确
- 恢复已取消的订阅 是否处理正确
- 价格变更用户同意/拒绝 是否处理正确
- 多设备同步 是否处理正确
- 网络异常情况 是否处理正确
- 恢复购买功能 是否处理正确
- 混合会员处理 （用户已有赠送会员再购买订阅） 是否处理正确

### 测试数据文件说明

在 `server/test/fixtures` 目录下包含了用于测试的各种 Apple 订阅通知 JSON 文件：

1. **subscribed.json** - 用户首次订阅通知

   - 通知类型: SUBSCRIBED
   - 产品: 月度订阅
   - 交易原因: PURCHASE
   - 用于测试用户首次购买订阅的处理流程

2. **did_renew.json** - 订阅续订通知

   - 通知类型: DID_RENEW
   - 产品: 月度订阅
   - 交易原因: RENEWAL
   - 用于测试订阅自动续订的处理流程

3. **upgrade.json** - 订阅升级通知

   - 通知类型: DID_CHANGE_RENEWAL_PREF
   - 子类型: UPGRADE
   - 产品: 从月度升级到年度订阅
   - 用于测试用户升级订阅套餐的处理流程

4. **downgrade.json** - 订阅降级通知

   - 通知类型: DID_CHANGE_RENEWAL_PREF
   - 子类型: DOWNGRADE
   - 产品: 从年度降级到月度订阅
   - 用于测试用户降级订阅套餐的处理流程

5. **cancel_auto_renew.json** - 取消自动续订通知

   - 通知类型: DID_CHANGE_RENEWAL_STATUS
   - 子类型: AUTO_RENEW_DISABLED
   - 产品: 月度订阅
   - autoRenewStatus: 0 (已关闭自动续订)
   - 用于测试用户取消自动续订的处理流程

6. **expired.json** - 订阅过期通知

   - 通知类型: EXPIRED
   - 子类型: VOLUNTARY
   - 产品: 月度订阅
   - 用于测试订阅自然过期的处理流程

7. **refund.json** - 退款通知

   - 通知类型: REFUND
   - 产品: 月度订阅
   - 交易原因: REFUND
   - 用于测试用户订阅退款的处理流程

8. **fail_to_renew.json** - 续订失败通知

   - 通知类型: DID_FAIL_TO_RENEW
   - 子类型: GRACE_PERIOD
   - 产品: 月度订阅
   - 用于测试订阅续订失败进入宽限期的处理流程

9. **price_increase_accepted.json** - 价格增加用户接受通知

   - 通知类型: PRICE_INCREASE
   - 子类型: ACCEPTED
   - 产品: 月度订阅
   - 价格: 从 12000 增加到 15000
   - 用于测试用户接受价格增加的处理流程

10. **price_increase_declined.json** - 价格增加用户拒绝通知
    - 通知类型: PRICE_INCREASE
    - 子类型: DECLINED
    - 产品: 月度订阅
    - 价格: 从 12000 增加到 15000
    - autoRenewStatus: 0 (用户拒绝价格增加，关闭自动续订)
    - 用于测试用户拒绝价格增加的处理流程

## 处理恢复购买

当点击恢复购买，检查到有购买记录

- 移除上一次购买记录所有者
- 订阅记录切换到新用户上

## 后续建议

1. 在真实设备上测试 Apple Pay 功能
2. 按照配置指南在 App Store Connect 中创建和配置订阅产品
3. 实现服务端收据验证以确保购买安全性
4. 添加更多错误处理和边界情况处理
5. 优化 UI/UX 设计，提升用户体验
6. 完善混合会员处理逻辑，确保赠送会员和购买订阅的正确叠加
