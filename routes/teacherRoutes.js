const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const teacherController = require("../controllers/teacherController");
router.use(authController.protect);

router.get("/", teacherController.getAllTeachers);

module.exports = router;
