const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  profilePicUrl: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: false },
  status: { type: String, default: "Hey there! I am using ChatApp" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

