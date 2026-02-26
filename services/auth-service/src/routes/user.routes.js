const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const auth = require("../middleware/auth.middleware");
const { getMyProfile, updateStatus } = require("../controllers/user.controller");
const upload = require("../middleware/upload");

// Wrapper to handle multer errors
const handleUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 9MB" });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || "File upload error" });
    }
    next();
  });
};

router.post(
  "/me/profile-pic",
  auth,
  handleUpload,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: user not found from token" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const imagePath = `/uploads/${req.file.filename}`;
      const previousImagePath = req.user.profilePicUrl;

      req.user.profilePicUrl = imagePath;
      await req.user.save();

      // Best-effort cleanup of old local image file
      if (previousImagePath && previousImagePath.startsWith("/uploads/") && previousImagePath !== imagePath) {
        const previousFileName = path.basename(previousImagePath);
        const absolutePath = path.join(__dirname, "..", "..", "uploads", previousFileName);

        fs.promises.unlink(absolutePath).catch(() => {
          // Ignore cleanup errors silently (file may already be missing)
        });
      }

      res.json({
        message: "Profile picture updated",
        profilePicUrl: imagePath,
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({
        message: "Failed to upload profile picture",
        error: process.env.NODE_ENV === "production" ? undefined : error.message,
      });
    }
  }
);

router.get("/me", auth, getMyProfile);
router.put("/me/status", auth, updateStatus);

module.exports = router;
