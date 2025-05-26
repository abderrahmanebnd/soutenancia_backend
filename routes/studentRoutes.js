const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const authController = require("../controllers/authController");

router.use(authController.protect);

router
  .route("/skills")
  .get(authController.restrictTo("student"), studentController.getAllSkills);

router
  .route("/add-skills")
  .post(authController.restrictTo("student"), studentController.addSkills);

router
  .route("/")
  .get(authController.restrictTo("admin"), studentController.getAllStudents);

router.get("/:id", studentController.getStudent);

module.exports = router;
