const express = require("express");
const router = express.Router();
const ProjectSelectionWindowController = require("../controllers/ProjectSelectionWindow");
const authController = require("../controllers/authController");

router.use(authController.protect);

router.get("/", ProjectSelectionWindowController.getProjectSelectionWindow);
router.get(
  "/:id",
  ProjectSelectionWindowController.getProjectSelectionWindowById
);

router.use(authController.restrictTo("admin"));

router.post("/", ProjectSelectionWindowController.createProjectSelectionWindow);
router.put(
  "/:id",
  ProjectSelectionWindowController.updateProjectSelectionWindow
);
router.delete(
  "/:id",
  ProjectSelectionWindowController.deleteProjectSelectionWindow
);

module.exports = router;

module.exports = router;