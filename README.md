## 项目介绍

用来开发 iOS 订阅支付应用

只需要支持 iOS 平台

## 支持订阅的产品

| 顺序 | 参考名称      | 产品 ID | 持续时间 | 状态      |
| ---- | ------------- | ------- | -------- | --------- |
| 1    | [连续包月](#) | month   | 1 个月   | ✅ 已批准 |
| 2    | [连续季度](#) | quarter | 3 个月   | ✅ 已批准 |
| 3    | [连续包年](#) | year    | 1 年     | ✅ 已批准 |

## 项目结构

- `/lib` - Flutter 前端代码
- `/server` - Node.js 后端服务
- `PRD.md` - 产品需求文档
- `AppStore配置指南.md` - App Store 配置指南

## 后端服务

本项目包含一个完整的 Node.js 后端服务，用于处理：

1. Apple Pay 订阅收据验证
2. 用户订阅状态管理
3. Apple App Store 服务器通知处理
4. 用户和订阅数据存储

后端服务使用 MongoDB 作为数据库，并实现了与 Apple App Store Server API 的集成。

### 启动后端服务

```bash
cd server
npm install
npm start
```

更多信息请查看 [server/README.md](server/README.md)

## 你必须阅读的文件

./PRD.md
