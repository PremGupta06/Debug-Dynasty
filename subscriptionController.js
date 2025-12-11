const User = require("../models/User");

exports.upgradeToPro = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.plan = "pro";
    // Optionally reset counters when user upgrades
    // user.resumeScanCount = 0;
    // user.chatCount = 0;

    await user.save();

    return res.json({
      message: "Subscription upgraded to Pro",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error("Upgrade error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
