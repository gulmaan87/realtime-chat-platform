// const express = require("express");
// const cors = require("cors");
// const authRoutes = require("./routes/auth.routes");
// const config = require("./config");

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use("/api/auth", authRoutes);

// // Health check
// app.get("/health", (req, res) => {
//   res.json({ status: "OK", service: "auth-service" });
// });

// // Root endpoint
// app.get("/", (req, res) => {
//   res.json({
//     service: "Auth Service",
//     status: "running",
//     endpoints: {
//       health: "/health",
//       login: "POST /api/auth/login",
//       register: "POST /api/auth/register",
//       verify: "POST /api/auth/verify",
//       refresh: "POST /api/auth/refresh",
//     },
//   });
// });

// module.exports = app;

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const contactRoutes = require("./routes/contact.routes");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory:", uploadsDir);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with CORS headers
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Cache-Control", "public, max-age=3600");
  next();
}, express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Set correct Content-Type based on file extension
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/contacts", contactRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "auth-service" });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Auth Service",
    status: "running",
    endpoints: {
      health: "/health",
      signup: "POST /auth/signup",
      login: "POST /auth/login",
    },
  });
});

module.exports = app;
