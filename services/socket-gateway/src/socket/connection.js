


const redis = require("../cache/redis");
const { publishMessage } = require("../queue/publisher");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.id; // placeholder (later real user ID)
    console.log(`Client connected: ${userId}`);

    await redis.set(`presence:${userId}`, "online", "EX", 60);

    socket.on("send_message", async (data) => {
      await publishMessage({
        sender: userId,
        roomId: data.roomId || "global",
        message: data.message,
        timestamp: Date.now(),
      });
    });

    socket.on("disconnect", async () => {
      console.log(`Client disconnected: ${userId}`);
      await redis.del(`presence:${userId}`);
    });
  });
};