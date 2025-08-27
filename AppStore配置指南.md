# 解决"未找到产品"错误的配置指南

## 问题分析
应用提示"未找到以下产品: com.dotdotbear.kwh.monthly, com.dotdotbear.kwh.yearly, com.dotdotbear.kwh.quarterly"，这说明这些产品ID在App Store Connect中尚未正确配置。

## 解决方案

### 1. 在App Store Connect中创建订阅产品

1. 登录 [App Store Connect](https://appstoreconnect.apple.com/)
2. 选择你的应用
3. 在左侧菜单中选择"功能" → "订阅"
4. 点击"+"按钮创建新的订阅组
5. 在订阅组中添加以下三个订阅产品：

#### 月度订阅 (com.dotdotbear.kwh.monthly)
- 产品ID: com.dotdotbear.kwh.monthly
- 引用名: 月度会员
- 价格: 根据地区设定（例如中国区 ¥18.00）
- 访问时长: 每月

#### 年度订阅 (com.dotdotbear.kwh.yearly)
- 产品ID: com.dotdotbear.kwh.yearly
- 引用名: 年度会员
- 价格: 根据地区设定（例如中国区 ¥128.00）
- 访问时长: 每年

#### 季度订阅 (com.dotdotbear.kwh.quarterly)
- 产品ID: com.dotdotbear.kwh.quarterly
- 引用名: 季度会员
- 价格: 根据地区设定（例如中国区 ¥45.00）
- 访问时长: 每季度

### 2. 确保Bundle ID匹配
- 项目中的Bundle ID: com.dotdotbear.kwh
- App Store Connect中的App Bundle ID必须与此完全一致

### 3. 提交审核
- 创建完订阅产品后，需要提交审核才能在沙盒环境中测试
- 审核通过前，产品在生产环境中不可用，但在沙盒环境中可以测试

### 4. 测试步骤
1. 使用沙盒测试账号进行测试
2. 在Xcode中设置正确的开发者账号和Bundle ID
3. 运行应用并尝试购买订阅产品

### 5. 常见问题排查
1. 确保产品ID完全匹配（包括大小写）
2. 确保订阅产品状态为"准备提交"或"已批准"
3. 确保使用沙盒测试账号进行测试
4. 确保设备地区设置与产品定价区域一致

## 后续开发建议
1. 实现服务端收据验证以确保购买安全性
2. 添加处理订阅状态变更的逻辑
3. 实现优惠价格和免费试用功能