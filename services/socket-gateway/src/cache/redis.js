const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected (Socket Gateway)");
  console.log("Redis connected (Message Worker)");
});

module.exports = redis;
