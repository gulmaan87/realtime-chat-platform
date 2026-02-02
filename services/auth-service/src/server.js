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
    console.log(`Database: ${"userdb"}`);
    console.log(`Host: ${"mongodb+srv://gulmanm8787_db_user:JOzuPNHZiLLXfkJV@cluster1.jczm3i1.mongodb.net/userdb?retryWrites=true&w=majority&appName=Cluster1"}:${"27017"}`);
    
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

