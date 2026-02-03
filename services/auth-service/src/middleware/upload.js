const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory:", uploadsDir);
}

// 1️⃣ Configure where and how files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path to ensure directory exists
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    // Example: userId-profile.jpg
    const ext = path.extname(file.originalname);

    // Use req.user._id (set by auth middleware) to ensure each user gets their own file
    // Fallback to req.userId for compatibility, then "anonymous" as last resort
    const safeUserId = req.user?._id?.toString() || req.userId || "anonymous";
    cb(null, `${safeUserId}-profile${ext}`);
  }
});

// 2️⃣ File type filter (only images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

// 3️⃣ Export configured multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 9 * 1024 * 1024 // 9MB max
  }
});

module.exports = upload;
