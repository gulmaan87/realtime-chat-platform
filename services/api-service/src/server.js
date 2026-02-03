require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const config = require("./config");
const chatRoutes = require("./routes/chat.routes");

const app = express();
app.use(express.json());

// MongoDB connection
const mongoUrl = process.env.MONGO_URL || "mongodb+srv://gulmanm8787_db_user:JOzuPNHZiLLXfkJV@cluster1.jczm3i1.mongodb.net/userdb?retryWrites=true&w=majority&appName=Cluster1";

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("MongoDB connected successfully (API Service)");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

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
