const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const {
  upgradeToPro
} = require("../controllers/subscriptionController");

router.post("/upgrade", auth, upgradeToPro);

module.exports = router;
