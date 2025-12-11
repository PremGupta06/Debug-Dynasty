// routes/careerRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { analyzeOnboarding } = require("../controllers/careerController");

router.post("/onboarding-analyze", auth, analyzeOnboarding);

module.exports = router;
