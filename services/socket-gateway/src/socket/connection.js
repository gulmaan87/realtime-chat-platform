const redis = require("../cache/redis");
const { publishMessage } = require("../queue/publisher");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    console.log(`Socket connected: ${socket.id}, userId: ${socket.userId}`);

    // Register this socket for the authenticated user
    socket.on("register", async () => {
      const userId = socket.userId;

      if (!userId) {
        console.warn(`register called without authenticated userId. socket: ${socket.id}`);
        return;
      }

      await redis.set(`user:${userId}`, socket.id);
      await redis.set(`presence:${userId}`, "online", "EX", 60);

      console.log(`REGISTERED ${userId} -> ${socket.id}`);
    });

    socket.on("private_message", async ({ to, message }) => {
      const fromUserId = socket.userId;

      if (!fromUserId || !to || !message) {
        return;
      }

      console.log(`PRIVATE MESSAGE ${fromUserId} -> ${to}: ${message}`);

      const payload = {
        from: fromUserId,
        fromUserId,
        to,
        toUserId: to,
        message,
        timestamp: Date.now(),
      };

      const targetSocketId = await redis.get(`user:${to}`);

      if (targetSocketId) {
        io.to(targetSocketId).emit("private_message", payload);
      } else {
        console.log(`User ${to} is offline`);
        // later: store in DB / queue
      }
    });


    socket.on("send_message", async (data) => {
      await publishMessage({
        sender: data.sender || socket.id,
        roomId: data.roomId || "global",
        message: data.message,
        timestamp: Date.now(),
      });
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}, userId: ${socket.userId}`);

      if (socket.userId) {
        await redis.del(`presence:${socket.userId}`);
      }
    });
  });
};


