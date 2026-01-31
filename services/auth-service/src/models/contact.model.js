const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  contactUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

contactSchema.index({ ownerUserId: 1, contactUserId: 1 }, { unique: true });
module.exports = mongoose.model("Contact", contactSchema);
