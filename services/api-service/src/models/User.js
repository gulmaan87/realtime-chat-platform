const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  profilePicUrl: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: false },
  status: { type: String, default: "Hey there! I am using ChatApp" },
  gamification: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: { type: [String], default: [] },
  },
  socialPrivacy: {
    showFriendshipInsights: { type: Boolean, default: true },
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

