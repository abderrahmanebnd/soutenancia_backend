const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const teacherController = require("../controllers/teacherController");
router.use(authController.protect);

router.get("/", teacherController.getAllTeachers);
router.get("/:id", teacherController.getTeacher);

module.exports = router;
