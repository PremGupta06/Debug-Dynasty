// routes/resumeRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const auth = require("../middleware/auth");
const resumeController = require("../controllers/resumeController");

// DEBUG – you can keep this temporarily to verify controller
console.log("resumeController keys:", Object.keys(resumeController));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".docx", ".txt", ".md"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf, .docx, .txt files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// POST /api/resume/analyze  (text or file)
router.post(
  "/analyze",
  auth,
  upload.single("resume"),
  resumeController.analyzeResume
);

// GET /api/resume/history  (Pro only)
router.get("/history", auth, resumeController.getResumeHistory);

module.exports = router;
