const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const config = require("./config");
const registerSocketHandlers = require("./socket/connection");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
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
