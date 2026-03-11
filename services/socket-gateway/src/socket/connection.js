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
      const toUserId = to ? String(to) : "";

      if (!fromUserId || !toUserId || !message) {
        return;
      }

      const roomId = [String(fromUserId), toUserId].sort().join(":");
      console.log(`PRIVATE MESSAGE ${fromUserId} -> ${toUserId}: ${message}`);

      const messagePayload = {
        from: fromUserId,
        fromUserId,
        to: toUserId,
        toUserId,
        roomId,
        message,
        timestamp: Date.now(),
      };

      const targetSocketId = await redis.get(`user:${toUserId}`);

      await publishMessage(messagePayload);

      if (targetSocketId) {
        io.to(targetSocketId).emit("private_message", messagePayload);
      } else {
        console.log(`User ${toUserId} is offline`);
      }
    });


    socket.on("typing_metadata", async ({ toUserId, metadata }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";

      if (!fromUserId || !targetUserId || !metadata || typeof metadata !== "object") {
        return;
      }

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("typing_metadata", {
        fromUserId,
        toUserId: targetUserId,
        metadata,
        timestamp: Date.now(),
      });
    });

    socket.on("typing_stop", async ({ toUserId }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";

      if (!fromUserId || !targetUserId) {
        return;
      }

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("typing_stop", {
        fromUserId,
        toUserId: targetUserId,
        timestamp: Date.now(),
      });
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
