require("dotenv").config();

module.exports = {
  port: process.env.AUTH_PORT || 3002,
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  mongoUrl: process.env.MONGO_URL || "mongodb+srv://gulmanm8787_db_user:JOzuPNHZiLLXfkJV@cluster1.jczm3i1.mongodb.net/userdb?retryWrites=true&w=majority&appName=Cluster1",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
};

