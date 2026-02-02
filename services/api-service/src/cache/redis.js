const Redis = require("ioredis");
const config = require("../config");

const redis = new Redis(config.redisUrl);

redis.on("connect", () => {
  console.log("Redis connected (API Service)");
});

redis.on("error", (err) => {
  console.error("Redis connection error (API Service):", err.message);
});

module.exports = redis;
