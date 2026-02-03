const Redis = require("ioredis");
const config = require("../config");

let redis;

if (!config.redisUrl) {
  console.warn("No REDIS_URL configured; Redis cache disabled for API Service");

  // Safe no-op fallback so the API can still run without Redis
  redis = {
    async lrange() {
      return [];
    },
    on() {},
  };
} else {
  redis = new Redis(config.redisUrl, {
    // Back off gradually and stop after a while instead of retry storms
    retryStrategy(times) {
      if (times > 20) return null; // give up after ~20 attempts
      return Math.min(times * 500, 10_000); // up to 10s
    },
    maxRetriesPerRequest: 2,
  });

  redis.on("connect", () => {
    console.log("Redis connected (API Service)");
  });

  redis.on("error", (err) => {
    console.error("Redis connection error (API Service):", err.message);
  });
}

module.exports = redis;
