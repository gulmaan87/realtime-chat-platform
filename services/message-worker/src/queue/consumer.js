const amqp = require("amqplib");
const { processMessage } = require("../processors/persistMessage");

async function connectWithRetry(queueUrl, maxRetries = 10, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempting to connect to RabbitMQ (attempt ${i + 1}/${maxRetries})...`);
      const connection = await amqp.connect(queueUrl);
      console.log("Successfully connected to RabbitMQ");
      return connection;
    } catch (err) {
      if (i === maxRetries - 1) {
        throw err;
      }
      console.log(`Connection failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function startConsumer(queueUrl) {
  const connection = await connectWithRetry(queueUrl);
  const channel = await connection.createChannel();

  const queue = "chat_messages";
  await channel.assertQueue(queue, { durable: true });

  console.log(`Waiting for messages in queue: ${queue}`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      await processMessage(data);
      channel.ack(msg);
    } catch (err) {
      console.error("Message processing failed", err);
      // Message will be retried
    }
  });
}

module.exports = { startConsumer };
