// controllers/resumeController.js
const fs = require("fs");
const User = require("../models/User");
const ResumeAnalysis = require("../models/ResumeAnalysis");
const {
  analyzeResumeText,
  generateResumeSuggestions
} = require("../services/aiService");
const { parseResumeFile } = require("../utils/parseResumeFile");

const FREE_MAX_RESUME_SCANS = 3;

// simple heuristic scoring for resume quality
function computeResumeScore(analysis, resumeText) {
  let score = 40;
  const skills = (analysis.skills || []).map((s) => s.toLowerCase());
  const missing = (analysis.missing_skills || []).map((s) => s.toLowerCase());
  const text = (resumeText || "").toLowerCase();

  if (skills.length) {
    const recognized = skills.filter((s) => !missing.includes(s)).length;
    const skillPct = Math.min(1, recognized / Math.max(1, skills.length));
    score += Math.round(skillPct * 30); // up to +30
  }

  const expMap = {
    intern: 5,
    "entry-level": 5,
    junior: 8,
    "mid-level": 10,
    senior: 12,
    lead: 15
  };
  const exp = (analysis.experience_level || "").toLowerCase();
  if (exp && expMap[exp]) score += expMap[exp];

  const projectKeywords = [
    "project",
    "github",
    "portfolio",
    "deployed",
    "contributed",
    "internship"
  ];
  const projectHits = projectKeywords.reduce(
    (acc, k) => acc + (text.includes(k) ? 1 : 0),
    0
  );
  score += Math.min(15, projectHits * 3); // up to +15

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 150) score -= 10;
  if (wordCount < 80) score -= 10;

  score = Math.max(0, Math.min(100, score));
  return score;
}

const analyzeResume = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.plan === "free" && user.resumeScanCount >= FREE_MAX_RESUME_SCANS) {
      return res.status(403).json({
        message: "Free plan resume scan limit reached. Upgrade to Pro."
      });
    }

    let resumeText = req.body.resumeText || "";

    if (req.file) {
      const filePath = req.file.path;
      try {
        const extracted = await parseResumeFile(filePath);
        resumeText = resumeText || extracted || resumeText;
      } catch (e) {
        console.error("Error parsing uploaded file:", e.message);
      } finally {
        fs.unlink(filePath, () => {});
      }
    }

    if (!resumeText) {
      return res.status(400).json({
        message:
          "No resume text provided. Upload a .txt/.pdf/.docx or send raw text in resumeText."
      });
    }

    const analysis = await analyzeResumeText(resumeText);

    const rating = computeResumeScore(analysis, resumeText);

    let suggestions = [];
    try {
      suggestions = await generateResumeSuggestions(resumeText, analysis);
    } catch (e) {
      console.error("Suggestion generation error:", e.message);
    }

    analysis.rating = rating;
    analysis.suggestions = suggestions;

    const historyEntry = await ResumeAnalysis.create({
      user: userId,
      resumeText,
      analysis
    });

    user.resumeScanCount += 1;
    await user.save();

    return res.json({
      analysis,
      historyId: historyEntry._id
    });
  } catch (err) {
    console.error("Resume analysis error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getResumeHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.plan !== "pro") {
      return res
        .status(403)
        .json({ message: "Resume history is available for Pro users only." });
    }

    const history = await ResumeAnalysis.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ history });
  } catch (err) {
    console.error("Get resume history error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  analyzeResume,
  getResumeHistory
};
