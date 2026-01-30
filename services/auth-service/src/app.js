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
const authRoutes = require("./routes/auth.routes");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

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
