// User model (placeholder - will be replaced with actual DB model later)
// For now, using in-memory storage or Redis

// class User {
//   constructor(data) {
//     this.id = data.id;
//     this.username = data.username;
//     this.email = data.email;
//     this.passwordHash = data.passwordHash;
//     this.createdAt = data.createdAt || new Date();
//     this.updatedAt = data.updatedAt || new Date();
//   }

//   toJSON() {
//     return {
//       id: this.id,
//       username: this.username,
//       email: this.email,
//       createdAt: this.createdAt,
//       updatedAt: this.updatedAt,
//     };
//   }
// }

// module.exports = User;



const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  profilePicUrl: { type: String, default: "" },
  status: { type: String, default: "Hey there! I am using ChatApp" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
