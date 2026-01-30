const express = require("express");
const { getChatHistory } = require("../controllers/chat.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// router.get("/:roomId", getChatHistory);
router.get("/:roomId", authMiddleware, getChatHistory);

module.exports = router;
