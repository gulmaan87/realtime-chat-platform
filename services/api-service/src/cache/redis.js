const Redis = require("ioredis");
const config = require("../config");

const redis = new Redis(config.redisUrl);

redis.on("connect", () => {
  console.log("Redis connected (API Service)");
});

module.exports = redis;
