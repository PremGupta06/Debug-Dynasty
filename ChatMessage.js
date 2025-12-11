const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    userMessage: {
      type: String,
      required: true
    },
    aiResponse: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
module.exports = ChatMessage;
