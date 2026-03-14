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
    
    // Fetch edits and deletions
    const edits = await redis.hgetall(`room_edits:${roomId}`) || {};
    const deletions = await redis.smembers(`room_deletions:${roomId}`) || [];

    const messages = entries
      .map((item) => {
        try {
          const parsed = JSON.parse(item);
          if (!parsed || !parsed.localId) return parsed;
          if (deletions.includes(parsed.localId)) {
            return { ...parsed, isDeleted: true, message: "This message was deleted" };
          }
          if (edits[parsed.localId]) {
            const editData = JSON.parse(edits[parsed.localId]);
            return { ...parsed, message: editData.newText, isEdited: true, editHistory: editData.history };
          }
          return parsed;
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
