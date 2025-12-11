// controllers/chatController.js
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const { careerChat } = require("../services/aiService");

const FREE_MAX_CHAT_MESSAGES = 15;

// 🔒 any message containing these patterns will be blocked (all lowercase!)
const BLOCKED_PATTERNS = [
  "scholar",        // scholarship, scholarships
  "scholarship",
  "scholarships",
  "schollarchip",   // typo handling
  "fees",
  "fee",
  "loan",
  "loans",
  "financial aid",
  "money help",
  "donation",
  "bank",
  "homework",
  "assignment"
];

const ALLOWED_KEYWORDS = [
  "career",
  "job",
  "jobs",
  "internship",
  "internships",
  "skill",
  "skills",
  "roadmap",
  "learning path",
  "learning",
  "resume",
  "cv",
  "developer",
  "engineer",
  "engineering",
  "data science",
  "web development",
  "software",
  "it field",
  "tech field",
  "technology",
  "college branch",
  "branch",
  "domain",
  "after 10th",
  "after 12th",
  "btech",
  "b.tech",
  "bsc",
  "b.sc",
  "mca",
  "be"
];

const askChatbot = async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const lower = message.toLowerCase();

    // 🔒 1) Block forbidden topics BEFORE calling AI
    if (BLOCKED_PATTERNS.some((pattern) => lower.includes(pattern))) {
      return res.status(400).json({
        message:
          "I'm not allowed to answer scholarship, financial-support, homework or assignment related questions."
      });
    }

    // 🔒 2) Allow only clearly career-related messages
    const isCareerRelated = ALLOWED_KEYWORDS.some((k) => lower.includes(k));

    if (!isCareerRelated) {
      return res.status(400).json({
        message:
          "I can only answer career-related questions (jobs, skills, learning path, internships, resume, tech fields, etc.)."
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Free plan limit
    if (user.plan === "free" && user.chatCount >= FREE_MAX_CHAT_MESSAGES) {
      return res.status(403).json({
        message: "Free plan chat limit reached. Upgrade to Pro."
      });
    }

    // Short history (last 5 messages)
    const history = await ChatMessage.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const reversed = history.reverse(); // oldest first

    const aiResponse = await careerChat(message, reversed);

    // Save chat
    const chatDoc = await ChatMessage.create({
      user: userId,
      userMessage: message,
      aiResponse
    });

    // Increment counter
    user.chatCount += 1;
    await user.save();

    return res.json({
      reply: aiResponse,
      chatId: chatDoc._id
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // History is Pro-only
    if (user.plan !== "pro") {
      return res.status(403).json({
        message: "Chat history is available for Pro users only."
      });
    }

    const history = await ChatMessage.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ history });
  } catch (err) {
    console.error("Get chat history error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  askChatbot,
  getChatHistory
};
