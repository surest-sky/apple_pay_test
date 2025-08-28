// n8n Function Node code for sending Apple subscription notifications to WeChat Work robot
module.exports = async function (processData) {
  const { items } = processData;

  // Set timezone to Shanghai
  process.env.TZ = "Asia/Shanghai";

  // WeChat Work robot webhook URL
  const webhookUrl =
    "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=5ef91d88-4**0d553b86a";

  // Process each item in the input
  for (const item of items) {
    try {
      // Extract key information
      const notificationType = item.notificationType || "Unknown";
      const subtype = item.subtype || "N/A";
      const originalTransactionId = item.originalTransactionId || "Unknown";
      const productId = item.productId || "Unknown";
      const transactionId = item.transactionId || "Unknown";
      const environment =
        (item.decodedTransactionInfo &&
          item.decodedTransactionInfo.environment) ||
        (item.decodedRenewalInfo && item.decodedRenewalInfo.environment) ||
        "Unknown";

      // Format expiry date if available
      let expiryDate = "Unknown";
      if (
        item.decodedTransactionInfo &&
        item.decodedTransactionInfo.expiresDate
      ) {
        expiryDate = new Date(
          item.decodedTransactionInfo.expiresDate
        ).toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
        });
      }

      // Format purchase date if available
      let purchaseDate = "Unknown";
      if (
        item.decodedTransactionInfo &&
        item.decodedTransactionInfo.purchaseDate
      ) {
        purchaseDate = new Date(
          item.decodedTransactionInfo.purchaseDate
        ).toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
        });
      }

      // Current time in Shanghai
      const currentTime = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      });

      // Create message content
      const message = `
🍎 Apple订阅通知

通知类型: ${notificationType}${subtype !== "N/A" ? ` (${subtype})` : ""}
产品ID: ${productId}
交易ID: ${transactionId}
原始交易ID: ${originalTransactionId}
环境: ${environment}
购买时间: ${purchaseDate}
过期时间: ${expiryDate}
通知时间: ${currentTime}
      `.trim();

      // Send to WeChat Work robot
      const response = await require("axios").post(webhookUrl, {
        msgtype: "text",
        text: {
          content: message,
        },
      });

      console.log(
        `Message sent to WeChat Work for transaction ${originalTransactionId}:`,
        response.data
      );

      // Add status to the item
      item.wechatNotificationStatus = "sent";
      item.wechatNotificationTime = new Date().toISOString();
    } catch (error) {
      console.error(
        "Error sending notification to WeChat Work:",
        error.message
      );
      item.wechatNotificationStatus = "failed";
      item.wechatNotificationError = error.message;
    }
  }

  return { items };
};
