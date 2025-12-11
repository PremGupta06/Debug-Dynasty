// routes/chatRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const chatController = require("../controllers/chatController");

// Debug logs – to confirm everything is loaded correctly
console.log("chatController keys:", Object.keys(chatController));
console.log("auth type:", typeof auth);

// POST /api/chat/ask  -> ask the AI
router.post("/ask", auth, chatController.askChatbot);

// GET /api/chat/history -> get chat history (Pro only)
router.get("/history", auth, chatController.getChatHistory);

module.exports = router;
