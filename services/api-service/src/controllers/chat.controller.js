const redis = require("../cache/redis");

function buildRoomId(userA, userB) {
  return [String(userA), String(userB)].sort().join(":");
}

async function getChatHistory(req, res) {
  const { roomId } = req.params;
  const currentUserId = req.userId || req.user?._id?.toString();

  if (!roomId || !currentUserId) {
    return res.status(400).json({ message: "Invalid chat history request" });
  }

  const participants = roomId.split(":");
  if (participants.length !== 2 || !participants.includes(String(currentUserId))) {
    return res.status(403).json({ message: "Not allowed to access this chat room" });
  }

  try {
    await redis.connect().catch(() => {});
    const redisKey = `room:${roomId}`;
    const entries = await redis.lrange(redisKey, 0, 99);
    const messages = entries
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    return res.json({ source: "redis", messages });
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return res.json({ source: "fallback", messages: [] });
  }
}

module.exports = { getChatHistory, buildRoomId };
