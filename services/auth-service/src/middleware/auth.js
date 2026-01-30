const jwt = require("jsonwebtoken");
const config = require("../config");

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: "Access token required",
    });
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: "Invalid or expired token",
      });
    }

    req.user = decoded;
    next();
  });
}

module.exports = {
  authenticateToken,
};

