module.exports = function authMiddleware(req, res, next) {
    const token = req.headers.authorization;
  
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: missing Authorization header",
      });
    }
  
    // Placeholder for real token validation (JWT/OAuth later)
    next();
  };
  