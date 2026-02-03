const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { getMyProfile, updateStatus } = require("../controllers/user.controller");
const upload = require("../middleware/upload");
const User = require("../models/User");
const multer = require("multer");

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
        // Ensure req.user is set by auth middleware
        if (!req.user) {
          console.error("Profile-pic upload: missing req.user");
          return res.status(401).json({ message: "Unauthorized: user not found from token" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
    
        console.log("File uploaded:", req.file);
        console.log("File path:", req.file.path);
        console.log("File filename:", req.file.filename);
        console.log("User ID:", req.user._id);
    
        const imagePath = `/uploads/${req.file.filename}`;
    
        // Update ONLY the logged-in user (req.user)
        req.user.profilePicUrl = imagePath;
        await req.user.save();
    
        console.log("Updated user profilePicUrl:", req.user.profilePicUrl);
        console.log("Image will be served at:", imagePath);
    
        res.json({
          message: "Profile picture updated",
          profilePicUrl: imagePath
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
