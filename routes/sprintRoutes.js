const express = require("express");
const sprintController = require("../controllers/sprintController");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true }); // Enable access to projectId param

const { protect, restrictTo } = authController;

router.use(protect);
router.use(restrictTo("student", "teacher", "admin"));

router.route("/").post(sprintController.createSprint);

// TODO: ensure that only the teamMember and the teacher of the project can access this routes

router.route("").get(sprintController.getSprintsByProject); // here we should add query params to filter by teamId and if the student is not a team member or not the teacher of the prject , we should return an error 403

router
  .route("/:sprintId")
  .get(sprintController.getSprint)
  .patch(sprintController.updateSprint)
  .delete(sprintController.deleteSprint);

module.exports = router;
