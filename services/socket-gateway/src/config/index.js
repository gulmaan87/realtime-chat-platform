require("dotenv").config();

module.exports = {
  port: process.env.SOCKET_PORT || 3001,
  // Use the same JWT secret as the auth service so we can verify user tokens
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
};
