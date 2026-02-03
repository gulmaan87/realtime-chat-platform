const User = require("../models/User");

// GET MY PROFILE
exports.getMyProfile = async (req, res) => {
  try {
    // Use req.user set by auth middleware - ensures we get ONLY the logged-in user's data
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: user not found from token" });
    }

    console.log("Fetching profile for userId:", req.user._id);
    
    // Return user data (already fetched by middleware)
    const userData = {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      status: req.user.status,
      profilePicUrl: req.user.profilePicUrl
    };

    console.log("Profile found:", { username: userData.username, email: userData.email });
    res.json(userData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// UPDATE STATUS
exports.updateStatus = async (req, res) => {
  try {
    // Use req.user set by auth middleware - ensures we update ONLY the logged-in user
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: user not found from token" });
    }

    const { status } = req.body;

    // Update ONLY the logged-in user (req.user)
    req.user.status = status;
    await req.user.save();

    res.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
