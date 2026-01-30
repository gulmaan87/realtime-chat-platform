const amqp = require("amqplib");

let channel;

async function connectQueue() {
  const connection = await amqp.connect(process.env.QUEUE_URL);
  channel = await connection.createChannel();
  await channel.assertQueue("chat_messages", { durable: true });
}

async function publishMessage(message) {
  if (!channel) {
    await connectQueue();
  }
  channel.sendToQueue(
    "chat_messages",
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
}

module.exports = { publishMessage };
