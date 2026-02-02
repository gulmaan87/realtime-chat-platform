const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected (Message Worker)");
});

redis.on("error", (err) => {
  console.error("Redis connection error (Message Worker):", err.message);
});

module.exports = redis;


