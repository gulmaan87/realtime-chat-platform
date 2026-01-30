const redis = require("../cache/redis");

async function getChatHistory(req, res) {
  const { roomId } = req.params;

  const cacheKey = `room:${roomId}`;
  const cachedMessages = await redis.lrange(cacheKey, 0, -1);

  if (cachedMessages.length > 0) {
    return res.json({
      source: "cache",
      messages: cachedMessages.map(JSON.parse),
    });
  }

  // Placeholder for DB fetch (Week 6+)
  res.json({
    source: "db",
    messages: [],
  });
}

module.exports = { getChatHistory };
