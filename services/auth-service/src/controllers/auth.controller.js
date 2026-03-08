const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config");

const scryptAsync = promisify(scrypt);
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;


async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION
  });

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt,
    Buffer.from(key).toString("hex")
  ].join("$");
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  const [algorithm, n, r, p, salt, keyHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !keyHex) {
    return false;
  }

  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedKey = await scryptAsync(password, salt, keyBuffer.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  });

  const derivedBuffer = Buffer.from(derivedKey);
  if (derivedBuffer.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, keyBuffer);
}

function issueAuthResponse(res, user, statusCode = 200) {
  const token = jwt.sign(
    { userId: user._id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return res.status(statusCode).json({
    token,
    user: { id: user._id, username: user.username, email: user.email }
  });
}


async function verifyGoogleIdToken(idToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error("Unable to verify Google token");
  }

  const payload = await response.json();
  if (payload.aud !== config.googleClientId) {
    throw new Error("Google token audience mismatch");
  }

  return payload;
}

async function generateUniqueUsername(baseName = "google_user") {
  const normalized = String(baseName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "google_user";

  let candidate = normalized;
  let suffix = 0;

  while (await User.findOne({ username: candidate })) {
    suffix += 1;
    candidate = `${normalized}_${suffix}`;
  }

  return candidate;
}

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ message: "User already exists" });

    const passwordHash = await hashPassword(password);

    const user = await User.create({ username, email, passwordHash });

    issueAuthResponse(res, user, 201);
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

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ message: "Invalid credentials" });

    issueAuthResponse(res, user);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    if (!config.googleClientId) {
      return res.status(500).json({ message: "Google OAuth is not configured" });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const email = payload?.email;
    const emailVerified = payload?.email_verified === "true" || payload?.email_verified === true;

    if (!email || !emailVerified) {
      return res.status(401).json({ message: "Invalid Google account" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const baseUsername = payload?.name || email.split("@")[0] || "google_user";
      const username = await generateUniqueUsername(baseUsername);

      user = await User.create({
        username,
        email,
        passwordHash: `google_oauth$${payload.sub}`
      });
    }

    issueAuthResponse(res, user);
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ message: "Google authentication failed" });
  }
};

// Get all users (for contact list)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).select("username email profilePicUrl status");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
