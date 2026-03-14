const redis = require("../cache/redis");
const { publishMessage } = require("../queue/publisher");

// Poll for scheduled messages every second
setInterval(async () => {
  try {
    const now = Date.now();
    const messages = await redis.zrangebyscore("scheduled_messages", 0, now);
    if (messages && messages.length > 0) {
      for (const msgStr of messages) {
        await redis.zrem("scheduled_messages", msgStr);
        try {
          const msg = JSON.parse(msgStr);
          await publishMessage(msg);
          // Optional: we can't easily emit to specific sockets without `io` here, 
          // but we can rely on the worker to persist it, or we can use a global event.
          // Since we need io, we will pass it into the function or handle it in the connection.
        } catch (e) {
          console.error("Failed to process scheduled message", e);
        }
      }
    }
  } catch(e) {}
}, 1000);

module.exports = (io) => {
  // We can also have a poller here that has access to `io`
  setInterval(async () => {
    try {
      const now = Date.now();
      const messages = await redis.zrangebyscore("scheduled_messages_io", 0, now);
      if (messages && messages.length > 0) {
        for (const msgStr of messages) {
          await redis.zrem("scheduled_messages_io", msgStr);
          try {
            const msg = JSON.parse(msgStr);
            await publishMessage(msg);
            
            const targetSocketId = await redis.get(`user:${msg.toUserId}`);
            if (targetSocketId) {
              io.to(targetSocketId).emit("private_message", msg);
            }
            const senderSocketId = await redis.get(`user:${msg.fromUserId}`);
            if (senderSocketId) {
              io.to(senderSocketId).emit("private_message", msg);
            }
          } catch (e) {
            console.error("Failed to process scheduled message in io", e);
          }
        }
      }
    } catch(e) {}
  }, 1000);

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

    socket.on("private_message", async (payload = {}) => {
      const fromUserId = socket.userId;
      const toUserId = payload.toUserId ? String(payload.toUserId) : payload.to ? String(payload.to) : "";
      const message = typeof payload.message === "string" ? payload.message : "";

      if (!fromUserId || !toUserId || !message) {
        return;
      }

      const roomId = [String(fromUserId), toUserId].sort().join(":");
      console.log(`PRIVATE MESSAGE ${fromUserId} -> ${toUserId}: ${message}`);

      const messagePayload = {
        ...payload,
        localId: String(payload.localId || `${String(fromUserId)}-${toUserId}-${Date.now()}`),
        from: payload.from || String(fromUserId),
        fromUserId: String(fromUserId),
        to: toUserId,
        toUserId,
        roomId,
        message,
        timestamp: Number(payload.timestamp || Date.now()),
        type: payload.type || "text",
        replyTo: payload.replyTo || null,
        threadId: payload.threadId || null,
        reactions: payload.reactions && typeof payload.reactions === "object" ? payload.reactions : {},
      };

      if (payload.scheduledFor && payload.scheduledFor > Date.now()) {
        await redis.zadd("scheduled_messages_io", payload.scheduledFor, JSON.stringify(messagePayload));
        // Notify sender it's scheduled
        socket.emit("message_scheduled", messagePayload);
        return;
      }

      const targetSocketId = await redis.get(`user:${toUserId}`);

      await publishMessage(messagePayload);

      if (targetSocketId) {
        io.to(targetSocketId).emit("private_message", messagePayload);
      } else {
        console.log(`User ${toUserId} is offline`);
      }
    });

    socket.on("edit_message", async ({ toUserId, messageId, newText, history }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";
      if (!fromUserId || !targetUserId || !messageId || !newText) return;
      
      const roomId = [String(fromUserId), targetUserId].sort().join(":");
      await redis.hset(`room_edits:${roomId}`, String(messageId), JSON.stringify({ newText, history }));

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("edit_message", {
        messageId: String(messageId),
        newText,
        history,
        userId: String(fromUserId),
        timestamp: Date.now(),
      });
    });

    socket.on("delete_message", async ({ toUserId, messageId }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";
      if (!fromUserId || !targetUserId || !messageId) return;

      const roomId = [String(fromUserId), targetUserId].sort().join(":");
      await redis.sadd(`room_deletions:${roomId}`, String(messageId));

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("delete_message", {
        messageId: String(messageId),
        userId: String(fromUserId),
        timestamp: Date.now(),
      });
    });



    socket.on("message_reaction", async ({ toUserId, messageId, emoji, action }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";
      if (!fromUserId || !targetUserId || !messageId || !emoji) return;

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("message_reaction", {
        messageId: String(messageId),
        emoji,
        action: action === "remove" ? "remove" : "add",
        userId: String(fromUserId),
        timestamp: Date.now(),
      });
    });

    socket.on("secret_unlock", async ({ toUserId, messageId }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";
      if (!fromUserId || !targetUserId || !messageId) return;

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("secret_unlock", {
        messageId: String(messageId),
        userId: String(fromUserId),
        timestamp: Date.now(),
      });
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


    socket.on("poll_vote", async ({ toUserId, messageId, optionId }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";
      if (!fromUserId || !targetUserId || !messageId || !optionId) return;

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("poll_vote", {
        messageId: String(messageId),
        optionId: String(optionId),
        voterId: String(fromUserId),
        timestamp: Date.now(),
      });
    });

    socket.on("mini_game_attempt", async ({ toUserId, messageId, choice }) => {
      const fromUserId = socket.userId;
      const targetUserId = toUserId ? String(toUserId) : "";
      if (!fromUserId || !targetUserId || !messageId || !choice) return;

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("mini_game_attempt", {
        messageId: String(messageId),
        choice: String(choice),
        playerId: String(fromUserId),
        timestamp: Date.now(),
      });
    });

    socket.on("whiteboard_sync", async (payload = {}) => {
      const fromUserId = socket.userId;
      const targetUserId = payload.toUserId ? String(payload.toUserId) : "";
      if (!fromUserId || !targetUserId) return;

      const targetSocketId = await redis.get(`user:${targetUserId}`);
      if (!targetSocketId) return;

      io.to(targetSocketId).emit("whiteboard_sync", {
        ...payload,
        fromUserId: String(fromUserId),
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
