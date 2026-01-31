const multer = require("multer");
const path = require("path");

// 1️⃣ Configure where and how files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    // Example: userId-profile.jpg
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId}-profile${ext}`);
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
    fileSize: 2 * 1024 * 1024 // 2MB max
  }
});

module.exports = upload;
