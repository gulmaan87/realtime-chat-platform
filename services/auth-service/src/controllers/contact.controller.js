const Contact = require("../models/contact.model");
const User = require("../models/User");

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.addContact = async (req, res) => {
  // Use req.user set by auth middleware - ensures we add contacts ONLY for the logged-in user
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: user not found from token" });
  }

  const ownerUserId = req.user._id;
  const rawIdentifier = req.body?.username || req.body?.identifier || req.body?.email || "";
  const identifier = String(rawIdentifier).trim();

  if (!identifier) {
    return res.status(400).json({ message: "Username or email is required" });
  }

  const escapedIdentifier = escapeRegex(identifier);
  const user = await User.findOne({
    $or: [
      { username: { $regex: `^${escapedIdentifier}$`, $options: "i" } },
      { email: { $regex: `^${escapedIdentifier}$`, $options: "i" } }
    ]
  });
  
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

  const createdContact = await Contact.create({
    ownerUserId,
    contactUserId: user._id
  });

  await createdContact.populate("contactUserId", "username email profilePicUrl status");

  res.json({
    message: "Contact added",
    contact: createdContact.contactUserId
  });
};


exports.getContacts = async (req, res) => {
    // Use req.user set by auth middleware - ensures we get contacts ONLY for the logged-in user
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: user not found from token" });
    }

    const ownerUserId = req.user._id;
    const contacts = await Contact.find({ ownerUserId })
      .populate("contactUserId", "username email profilePicUrl status");
  
    const safeContacts = contacts
      .map((contact) => contact.contactUserId)
      .filter(Boolean);

    res.json(safeContacts);
  };
  
