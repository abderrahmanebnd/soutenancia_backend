const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const authController = require("../controllers/authController");

router.use(authController.protect, authController.restrictTo("student"));

router.get("/skills", studentController.getAllSkills);

router.post("/add-skills", studentController.addSkills);
module.exports = router;
