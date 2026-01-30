const { startConsumer } = require("./queue/consumer");
const config = require("./config");

(async () => {
  try {
    console.log("Message Worker starting...");
    await startConsumer(config.queueUrl);
  } catch (err) {
    console.error("Failed to start message worker:", err);
    process.exit(1);
  }
})();
