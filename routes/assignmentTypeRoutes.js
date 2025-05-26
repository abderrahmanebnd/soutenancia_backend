const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const yearAssignmentTypeController = require("../controllers/assignmentTypeController");

router.use(authController.protect);
router.get("/", yearAssignmentTypeController.getYearAssignmentTypes);

router.use(authController.restrictTo("admin"));
router.post("/", yearAssignmentTypeController.createYearAssignmentType);
router.patch("/:id", yearAssignmentTypeController.updateYearAssignmentType);
router.delete("/:id", yearAssignmentTypeController.deleteYearAssignmentType);

module.exports = router;
