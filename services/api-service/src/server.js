const express = require("express");
const config = require("./config");
const chatRoutes = require("./routes/chat.routes");

const app = express();
app.use(express.json());

/* Root endpoint - informational */
app.get("/", (req, res) => {
  res.json({
    service: "API Service",
    status: "running",
    port: config.port,
    endpoints: {
      health: "/health",
      chatHistory: "GET /api/chats/:roomId",
    },
    usage: "Use the /api/chats/:roomId endpoint to retrieve chat history",
  });
});

app.use("/api/chats", chatRoutes);

app.get("/health", (_, res) => {
  res.json({ status: "OK" });
});

app.listen(config.port, () => {
  console.log(`API Service running on port ${config.port}`);
});
