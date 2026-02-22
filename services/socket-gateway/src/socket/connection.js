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
      await redis.set(`presence:${userId}`, "online");

      io.emit("presence_update", { userId, status: "online" });
      console.log(`REGISTERED ${userId} -> ${socket.id}`);
    });

    socket.on("request_presence", async ({ userIds }) => {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        socket.emit("presence_snapshot", []);
        return;
      }

      const uniqueIds = [...new Set(userIds.map((id) => String(id)).filter(Boolean))];
      const snapshot = await Promise.all(
        uniqueIds.map(async (userId) => {
          const presence = await redis.get(`presence:${userId}`);
          return { userId, status: presence === "online" ? "online" : "offline" };
        })
      );

      socket.emit("presence_snapshot", snapshot);
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

      if (!socket.userId) return;

      const mappedSocketId = await redis.get(`user:${socket.userId}`);
      if (mappedSocketId === socket.id) {
        await redis.del(`user:${socket.userId}`);
        await redis.del(`presence:${socket.userId}`);
        io.emit("presence_update", { userId: socket.userId, status: "offline" });
      }
    });
  });
};
