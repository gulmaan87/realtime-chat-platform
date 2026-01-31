const User = require("../models/User");

// GET MY PROFILE
exports.getMyProfile = async (req, res) => {
  try {
    console.log("Fetching profile for userId:", req.userId);
    const user = await User.findById(req.userId)
      .select("username email status profilePicUrl");

    if (!user) {
      console.log("User not found for userId:", req.userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Profile found:", { username: user.username, email: user.email });
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// UPDATE STATUS
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId, 
      { status },
      { new: true }
    ).select("username email status profilePicUrl");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
