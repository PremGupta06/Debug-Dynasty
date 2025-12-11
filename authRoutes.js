// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Local auth
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Optional test route
router.get("/ping", (req, res) => res.json({ ok: true, msg: "auth route works" }));

module.exports = router;
