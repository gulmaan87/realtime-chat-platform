const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("./config");
const registerSocketHandlers = require("./socket/connection");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Global Socket.IO middleware to require a valid JWT for every connection
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization || "";
    const headerToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    const tokenFromAuth = socket.handshake.auth && socket.handshake.auth.token;
    const token = tokenFromAuth || headerToken;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const payload = jwt.verify(token, config.jwtSecret);

    if (!payload || !payload.userId) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    // Attach the authenticated userId to the socket instance
    socket.userId = payload.userId.toString();

    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Authentication error"));
  }
});

registerSocketHandlers(io);

/* Root endpoint - informational */
app.get("/", (req, res) => {
  res.json({
    service: "Socket Gateway",
    status: "running",
    port: config.port,
    endpoints: {
      health: "/health",
      websocket: "ws://localhost:" + config.port,
    },
    usage: "Connect via Socket.IO client to use WebSocket functionality",
  });
});

/* Health check for load balancer */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

server.listen(config.port, () => {
  console.log(`Socket Gateway running on port ${config.port}`);
});
