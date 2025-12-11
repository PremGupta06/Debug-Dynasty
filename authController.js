// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// helper to generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // prevent duplicate email
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already used" });

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan }
    });
  } catch (err) {
    console.error("Signup error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    // select password explicitly
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan }
    });
  } catch (err) {
    console.error("Login error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
};
