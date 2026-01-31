// const express = require("express");
// const {
//   register,
//   login,
//   verifyToken,
//   refreshToken,
// } = require("../controllers/auth.controller");
// const { authenticateToken } = require("../middleware/auth");

// const router = express.Router();

// // Public routes
// router.post("/register", register);
// router.post("/login", login);
// router.post("/verify", verifyToken);
// router.post("/refresh", refreshToken);

// // Protected routes (example)
// router.get("/me", authenticateToken, (req, res) => {
//   res.json({
//     user: req.user,
//     message: "This is a protected route",
//   });
// });

// module.exports = router;

const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/users", authenticateToken, authController.getUsers);

module.exports = router;
