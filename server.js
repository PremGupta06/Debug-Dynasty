// server.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

// --- Config / env ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/aura_backend";
const NODE_ENV = process.env.NODE_ENV || "development";

// --- Create app BEFORE requiring routes (prevents "app before init" issues) ---
const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: "10mb" })); // adjust limit if needed
app.use(express.urlencoded({ extended: true }));
if (NODE_ENV === "development") app.use(morgan("dev"));

// --- Simple health check ---
app.get("/", (req, res) => res.json({ status: "ok", env: NODE_ENV }));

// --- Connect to MongoDB ---
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}
connectDB();

// --- ROUTES ---
// Require routes AFTER creating app to avoid ordering/circular require issues.
// Make sure these files exist in your project: routes/authRoutes.js, routes/chatRoutes.js, routes/resumeRoutes.js, routes/careerRoutes.js
// If you haven't created a route yet, either create it or comment out the corresponding require/app.use lines below.

try {
  const authRoutes = require("./routes/authRoutes");
  app.use("/api/auth", authRoutes);
  console.log("Mounted /api/auth");
} catch (e) {
  console.warn("authRoutes not found — skip mounting /api/auth. Create routes/authRoutes.js to enable.");
}


try {
  const chatRoutes = require("./routes/chatRoutes");
  app.use("/api/chat", chatRoutes);
} catch (e) {
  console.warn("chatRoutes not found — skip mounting /api/chat. Create routes/chatRoutes.js to enable.");
}

try {
  const resumeRoutes = require("./routes/resumeRoutes");
  app.use("/api/resume", resumeRoutes);
} catch (e) {
  console.warn("resumeRoutes not found — skip mounting /api/resume. Create routes/resumeRoutes.js to enable.");
}

try {
  const careerRoutes = require("./routes/careerRoutes");
  app.use("/api/career", careerRoutes);
} catch (e) {
  console.warn("careerRoutes not found — skip mounting /api/career. Create routes/careerRoutes.js to enable.");
}

// --- Static files (if needed) ---
// Serve a frontend build folder if you have one
const staticPath = path.join(__dirname, "public");
app.use(express.static(staticPath));

// --- 404 handler ---
app.use((req, res, next) => {
  res.status(404).json({ message: "Not found" });
});

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Export app for testing if you like
module.exports = app;
