// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const config = require("../config");
// const User = require("../models/User");

// // Placeholder user storage (replace with actual DB later)
// const users = new Map();

// // Generate JWT tokens
// function generateTokens(user) {
//   const payload = {
//     id: user.id,
//     username: user.username,
//     email: user.email,
//   };

//   const accessToken = jwt.sign(payload, config.jwtSecret, {
//     expiresIn: config.jwtExpiresIn,
//   });

//   const refreshToken = jwt.sign(payload, config.jwtSecret, {
//     expiresIn: config.jwtRefreshExpiresIn,
//   });

//   return { accessToken, refreshToken };
// }

// // Register new user
// async function register(req, res) {
//   try {
//     const { username, email, password } = req.body;

//     // Validation
//     if (!username || !email || !password) {
//       return res.status(400).json({
//         error: "Missing required fields: username, email, password",
//       });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({
//         error: "Password must be at least 6 characters",
//       });
//     }

//     // Check if user already exists
//     const existingUser = Array.from(users.values()).find(
//       (u) => u.username === username || u.email === email
//     );

//     if (existingUser) {
//       return res.status(409).json({
//         error: "User with this username or email already exists",
//       });
//     }

//     // Hash password
//     const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

//     // Create user
//     const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     const user = new User({
//       id: userId,
//       username,
//       email,
//       passwordHash,
//     });

//     users.set(userId, user);

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user);

//     res.status(201).json({
//       message: "User registered successfully",
//       user: user.toJSON(),
//       tokens: {
//         accessToken,
//         refreshToken,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

// // Login user
// async function login(req, res) {
//   try {
//     const { username, password } = req.body;

//     // Validation
//     if (!username || !password) {
//       return res.status(400).json({
//         error: "Username and password are required",
//       });
//     }

//     // Find user
//     const user = Array.from(users.values()).find(
//       (u) => u.username === username || u.email === username
//     );

//     if (!user) {
//       return res.status(401).json({
//         error: "Invalid credentials",
//       });
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, user.passwordHash);

//     if (!isValidPassword) {
//       return res.status(401).json({
//         error: "Invalid credentials",
//       });
//     }

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user);

//     res.json({
//       message: "Login successful",
//       user: user.toJSON(),
//       tokens: {
//         accessToken,
//         refreshToken,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

// // Verify token
// async function verifyToken(req, res) {
//   try {
//     const token = req.headers.authorization?.replace("Bearer ", "");

//     if (!token) {
//       return res.status(401).json({
//         error: "No token provided",
//       });
//     }

//     const decoded = jwt.verify(token, config.jwtSecret);

//     // Find user
//     const user = users.get(decoded.id);

//     if (!user) {
//       return res.status(401).json({
//         error: "User not found",
//       });
//     }

//     res.json({
//       valid: true,
//       user: user.toJSON(),
//     });
//   } catch (error) {
//     if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         valid: false,
//         error: "Invalid or expired token",
//       });
//     }

//     console.error("Token verification error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

// // Refresh token
// async function refreshToken(req, res) {
//   try {
//     const { refreshToken: token } = req.body;

//     if (!token) {
//       return res.status(400).json({
//         error: "Refresh token is required",
//       });
//     }

//     const decoded = jwt.verify(token, config.jwtSecret);

//     // Find user
//     const user = users.get(decoded.id);

//     if (!user) {
//       return res.status(401).json({
//         error: "User not found",
//       });
//     }

//     // Generate new tokens
//     const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

//     res.json({
//       tokens: {
//         accessToken,
//         refreshToken: newRefreshToken,
//       },
//     });
//   } catch (error) {
//     if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         error: "Invalid or expired refresh token",
//       });
//     }

//     console.error("Token refresh error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

// module.exports = {
//   register,
//   login,
//   verifyToken,
//   refreshToken,
// };


const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config");

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ username, email, passwordHash });

    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      token,
      user: { id: user._id, username, email }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all users (for contact list)
exports.getUsers = async (req, res) => {
  try {
    const User = require("../models/User");
    const users = await User.find({}, { passwordHash: 0 }).select("username email profilePicUrl status");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

