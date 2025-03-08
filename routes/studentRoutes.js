const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

router.get("/skills", studentController.getAllSkills);

router.post("/add-skills", studentController.addSkills);
module.exports = router;
