const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload.userId) {
      console.error("Token missing userId:", payload);
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Fetch the full user object from database
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Set both req.user (full object) and req.userId for compatibility
    req.user = user;
    req.userId = payload.userId;
    console.log("Token verified, userId:", req.userId);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};
