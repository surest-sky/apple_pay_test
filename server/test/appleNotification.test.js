const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Set timezone to Shanghai
process.env.TZ = 'Asia/Shanghai';

// node test/appleNotification.test.js subscribed
// node test/appleNotification.test.js expired
// Load environment variables
dotenv.config();

// Database connection
const connectDB = require("../config/db");
connectDB();

// Import the handleSubscriptionEvent function
const { handleSubscriptionEvent } = require("../routes/apple");

// Function to load all test fixtures
function loadFixtures() {
  const fixturesDir = path.join(__dirname, "fixtures");
  const fixtures = {};

  const files = fs.readdirSync(fixturesDir);
  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const fixtureName = path.basename(file, ".json");
      const fixturePath = path.join(fixturesDir, file);
      fixtures[fixtureName] = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    }
  });

  return fixtures;
}

// Function to run a specific test by fixture name
async function runSpecificTest(fixtureName) {
  console.log(`Starting specific test for ${fixtureName} notification...
`);

  // Load the specific fixture
  const fixturePath = path.join(__dirname, "fixtures", `${fixtureName}.json`);

  if (!fs.existsSync(fixturePath)) {
    console.error(`Fixture ${fixtureName} not found`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

  try {
    // Extract necessary data from the mock notification
    const notificationType = data.notificationType;
    const subtype = data.subtype;

    // Extract transaction info if available
    let transactionInfo = null;
    if (data.data && data.data.signedTransactionInfo) {
      transactionInfo = data.data.signedTransactionInfo;
    }

    // Extract renewal info if available
    let renewalInfo = null;
    if (data.data && data.data.signedRenewalInfo) {
      renewalInfo = data.data.signedRenewalInfo;
    }

    // Get original transaction ID
    const originalTransactionId =
      (transactionInfo && transactionInfo.originalTransactionId) ||
      (renewalInfo && renewalInfo.originalTransactionId) ||
      data.originalTransactionId ||
      (data.data && data.data.originalTransactionId) ||
      "2000000800763101";

    // Get product ID
    const productId =
      (transactionInfo && transactionInfo.productId) ||
      (renewalInfo && renewalInfo.productId) ||
      data.productId ||
      (data.data && data.data.productId) ||
      "month";

    // Get transaction ID
    const transactionId =
      (transactionInfo && transactionInfo.transactionId) ||
      data.transactionId ||
      (data.data && data.data.transactionId) ||
      "2000000991064386";

    // Test user ID
    const userId = "test-user-001";

    // Call the handleSubscriptionEvent function
    await handleSubscriptionEvent(
      userId,
      originalTransactionId,
      notificationType,
      subtype,
      transactionInfo,
      renewalInfo,
      null // notificationId (not used in this test)
    );

    console.log(`✓ ${fixtureName} notification processed successfully
`);
  } catch (error) {
    console.error(
      `✗ Error processing ${fixtureName} notification:`,
      error.message
    );
    console.log("");
  }
}

// Test function
async function runTests() {
  // Check if a specific test was requested via command line argument
  const specificTest = process.argv[2];

  if (specificTest) {
    // Run specific test
    await runSpecificTest(specificTest);
  } else {
    // Load all fixtures
    const fixtures = loadFixtures();

    // Test each notification type
    for (const [key, data] of Object.entries(fixtures)) {
      console.log(`Testing ${key} notification...`);

      try {
        // Extract necessary data from the mock notification
        const notificationType = data.notificationType;
        const subtype = data.subtype;

        // Extract transaction info if available
        let transactionInfo = null;
        if (data.data && data.data.signedTransactionInfo) {
          transactionInfo = data.data.signedTransactionInfo;
        }

        // Extract renewal info if available
        let renewalInfo = null;
        if (data.data && data.data.signedRenewalInfo) {
          renewalInfo = data.data.signedRenewalInfo;
        }

        // Get original transaction ID
        const originalTransactionId =
          (transactionInfo && transactionInfo.originalTransactionId) ||
          (renewalInfo && renewalInfo.originalTransactionId) ||
          data.originalTransactionId ||
          (data.data && data.data.originalTransactionId) ||
          "2000000800763101";

        // Get product ID
        const productId =
          (transactionInfo && transactionInfo.productId) ||
          (renewalInfo && renewalInfo.productId) ||
          data.productId ||
          (data.data && data.data.productId) ||
          "month";

        // Get transaction ID
        const transactionId =
          (transactionInfo && transactionInfo.transactionId) ||
          data.transactionId ||
          (data.data && data.data.transactionId) ||
          "2000000991064386";

        // Test user ID
        const userId = "test-user-001";

        // Call the handleSubscriptionEvent function
        await handleSubscriptionEvent(
          userId,
          originalTransactionId,
          notificationType,
          subtype,
          transactionInfo,
          renewalInfo,
          null // notificationId (not used in this test)
        );

        console.log(`✓ ${key} notification processed successfully
`);
      } catch (error) {
        console.error(`✗ Error processing ${key} notification:`, error.message);
        console.log("");
      }
    }

    console.log("All tests completed.");
  }
  
  // Exit the process
  process.exit(0);
}

// Run the tests
runTests().catch((error) => {
  console.error("Error running tests:", error);
  process.exit(1);
});

module.exports = { loadFixtures, runSpecificTest };
