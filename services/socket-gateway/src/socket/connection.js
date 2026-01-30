const redis = require("../cache/redis");
const { publishMessage } = require("../queue/publisher");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("register", async ({ userId }) => {
      await redis.set(`user:${userId}`, socket.id);
      await redis.set(`presence:${userId}`, "online", "EX", 60);

      console.log(`REGISTERED ${userId} -> ${socket.id}`);
    });

    socket.on("private_message", async ({ from, to, message }) => {
      console.log(`PRIVATE MESSAGE ${from} -> ${to}: ${message}`);

      const targetSocketId = await redis.get(`user:${to}`);

      if (targetSocketId) {
        io.to(targetSocketId).emit("private_message", {
          from,
          message,
          timestamp: Date.now(),
        });
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
      console.log(`Socket disconnected: ${socket.id}`);

      await redis.del(`presence:${socket.id}`);
    });
  });
};


