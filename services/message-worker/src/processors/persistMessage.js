const redis = require("../cache/redis");

async function processMessage(message) {
    console.log("Persisting message:", message);
  
    // Placeholder for DB write
    // Later: insert into messages table/collection
    const roomKey = `room:${message.roomId || "global"}`;

    await redis.lpush(roomKey, JSON.stringify(message));
    await redis.ltrim(roomKey, 0, 49); // keep last 50 messages
  }
  
  module.exports = { processMessage };
  