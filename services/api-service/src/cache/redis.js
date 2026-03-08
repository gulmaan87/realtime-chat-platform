const Redis = require("ioredis");
const config = require("../config");

const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  console.error("Redis error (API Service):", err.message);
});

module.exports = redis;
