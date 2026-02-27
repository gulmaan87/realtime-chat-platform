

const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/google", authController.googleAuth);
router.get("/users", authenticateToken, authController.getUsers);

module.exports = router;
