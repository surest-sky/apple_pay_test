const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Set timezone to Shanghai
process.env.TZ = "Asia/Shanghai";

// Load environment variables
dotenv.config();

// Database connection
const connectDB = require("./config/db");
connectDB();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Apple Pay Backend Service",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Import error handling middleware
const { ErrorHandler } = require("./utils/responseFormatter");

// Import routes
const subscriptionRoutes = require("./routes/subscriptions");
const userRoutes = require("./routes/users");
const appleRoutes = require("./routes/apple");

// Use routes
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/apple", appleRoutes);

// 404 错误处理中间件（必须在所有路由之后）
app.use(ErrorHandler.notFoundHandler);

// 全局错误处理中间件（必须在最后）
app.use(ErrorHandler.globalErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📅 时区设置: ${process.env.TZ}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || "development"}`);
  console.log(`🍎 Apple环境: ${process.env.APPLE_ENVIRONMENT || "sandbox"}`);
});

module.exports = app;
