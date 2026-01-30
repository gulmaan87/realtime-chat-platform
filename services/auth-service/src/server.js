require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config");

const PORT = config.port || 3002;

// Connect to MongoDB
mongoose
  .connect(config.mongoUrl)
  .then(() => {
    console.log("MongoDB connected successfully");
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.error("Connection string:", config.mongoUrl);
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

