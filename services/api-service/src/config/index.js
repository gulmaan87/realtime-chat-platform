require("dotenv").config();

module.exports = {
  port: process.env.API_PORT || 3000,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
};
