// Loop over input items and add a new field called 'myNewField' to the JSON of each one
var item = $input.first().json.body;

try {
  // Clone the original item to avoid modifying it directly
  const processedItem = { ...item };

  // Check if there's a signedPayload to decode
  if (item.signedPayload) {
    try {
      // The signedPayload is a JWT token, we need to decode the payload part
      const payload = item.signedPayload.split(".")[1];

      // Add proper padding if needed for base64 decoding
      const paddedPayload =
        payload.length % 4 === 0
          ? payload
          : payload + "=".repeat(4 - (payload.length % 4));

      // Base64 decode the payload
      const decodedPayload = Buffer.from(paddedPayload, "base64").toString(
        "utf8"
      );
      const notificationData = JSON.parse(decodedPayload);

      // Add decoded data to the item
      processedItem.decodedPayload = notificationData;
      processedItem.notificationType = notificationData.notificationType;
      processedItem.subtype = notificationData.subtype;

      // Extract transaction info if available
      if (
        notificationData.data &&
        notificationData.data.signedTransactionInfo
      ) {
        try {
          // Decode the signedTransactionInfo JWT payload
          const transactionPayload =
            notificationData.data.signedTransactionInfo.split(".")[1];
          const paddedTransactionPayload =
            transactionPayload.length % 4 === 0
              ? transactionPayload
              : transactionPayload +
                "=".repeat(4 - (transactionPayload.length % 4));
          const decodedTransaction = Buffer.from(
            paddedTransactionPayload,
            "base64"
          ).toString("utf8");
          processedItem.decodedTransactionInfo = JSON.parse(decodedTransaction);
        } catch (decodeError) {
          console.error("Failed to decode signedTransactionInfo:", decodeError);
          processedItem.transactionDecodeError = decodeError.message;
        }
      }

      // Extract renewal info if available
      if (notificationData.data && notificationData.data.signedRenewalInfo) {
        try {
          // Decode the signedRenewalInfo JWT payload
          const renewalPayload =
            notificationData.data.signedRenewalInfo.split(".")[1];
          const paddedRenewalPayload =
            renewalPayload.length % 4 === 0
              ? renewalPayload
              : renewalPayload + "=".repeat(4 - (renewalPayload.length % 4));
          const decodedRenewal = Buffer.from(
            paddedRenewalPayload,
            "base64"
          ).toString("utf8");
          processedItem.decodedRenewalInfo = JSON.parse(decodedRenewal);
        } catch (decodeError) {
          console.error("Failed to decode signedRenewalInfo:", decodeError);
          processedItem.renewalDecodeError = decodeError.message;
        }
      }

      // Get original transaction ID
      processedItem.originalTransactionId =
        (processedItem.decodedTransactionInfo &&
          processedItem.decodedTransactionInfo.originalTransactionId) ||
        (processedItem.decodedRenewalInfo &&
          processedItem.decodedRenewalInfo.originalTransactionId);

      // Get product ID
      processedItem.productId =
        processedItem.decodedTransactionInfo &&
        processedItem.decodedTransactionInfo.productId;

      // Get transaction ID
      processedItem.transactionId =
        processedItem.decodedTransactionInfo &&
        processedItem.decodedTransactionInfo.transactionId;
    } catch (decodeError) {
      console.error("Failed to decode signedPayload:", decodeError);
      processedItem.decodeError = decodeError.message;
    }
  }

  delete processedItem.signedPayload;
  delete processedItem.decodedPayload;
  return processedItem;
} catch (error) {
  console.error("Error processing item:", error);
  return {
    ...item,
    processingError: error.message,
  };
}
