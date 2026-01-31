const Contact = require("../models/contact.model");
const User = require("../models/user.model");

exports.addContact = async (req, res) => {
  const ownerUserId = req.userId;
  const { username } = req.body;

  const user = await User.findOne({ username });
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
