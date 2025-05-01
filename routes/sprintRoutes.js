const express = require("express");
const sprintController = require("../controllers/sprintController");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true }); // Enable access to projectId param

const { protect, restrictTo } = authController;

router.use(protect);
router.use(restrictTo("student", "teacher", "admin"));

router
  .route("/")
  .post(sprintController.createSprint)
  .get(sprintController.getSprintsByProject);

router
  .route("/:sprintId")
  .get(sprintController.getSprint)
  .patch(sprintController.updateSprint)
  .delete(sprintController.deleteSprint);

module.exports = router;
