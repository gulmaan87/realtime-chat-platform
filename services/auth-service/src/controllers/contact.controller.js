const Contact = require("../models/contact.model");
const User = require("../models/User");

exports.addContact = async (req, res) => {
  const ownerUserId = req.userId?.userId || req.userId;
  const { username } = req.body;
  
  if (!username?.trim() === "") {
    return res.status(400).json({ message: "Username is required" });
  }
  const user = await User.findOne({ username: username.trim() });
  
  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user._id.equals(ownerUserId)) {
    return res.status(400).json({ message: "Cannot add yourself" });
  }

  const exists = await Contact.findOne({
    ownerUserId,
    contactUserId: user._id
  });

  if (exists) {
    return res.status(409).json({ message: "Already in contacts" });
  }

  await Contact.create({
    ownerUserId,
    contactUserId: user._id
  });

  res.json({ message: "Contact added" });
};


exports.getContacts = async (req, res) => {
    const contacts = await Contact.find({ ownerUserId: req.userId })
      .populate("contactUserId", "username profilePicUrl status");
  
    res.json(
      contacts.map(c => c.contactUserId)
    );
  };
  