// controllers/careerController.js
const User = require("../models/User");
const { getOnboardingCareerSuggestions } = require("../services/aiService");

const analyzeOnboarding = async (req, res) => {
  try {
    const userId = req.userId;
    const { interest, hobby, education } = req.body;

    if (!interest || !hobby || !education) {
      return res
        .status(400)
        .json({ message: "interest, hobby and education are required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Call AI to get 3 career options
    const suggestions = await getOnboardingCareerSuggestions({
      interest,
      hobby,
      education
    });

    // Save onboarding data to user profile
    user.interest = interest;
    user.hobby = hobby;
    user.education = education;
    user.hasCompletedOnboarding = true;
    await user.save();

    return res.json({
      careers: suggestions // array of 3 career objects { title, why }
    });
  } catch (err) {
    console.error("Onboarding analyze error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  analyzeOnboarding
};
