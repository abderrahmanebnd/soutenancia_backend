const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const ProjectApplicationController = require("../controllers/ProjectApplicationController");
const ProjectSelectionWindowController = require("../controllers/ProjectSelectionWindow");

router.use(authController.protect);

//routes for student

router.get(
  "/my-assigned-project",
  authController.restrictTo("student"),
  ProjectApplicationController.getMyAssignedProject
);
router.get(
  "/my-applications",
  authController.restrictTo("student"),
  ProjectApplicationController.getMyApplications
);
router.post(
  "/projects/:id/apply",
  authController.restrictTo("student"),
  ProjectSelectionWindowController.isProjectSelectionActive,
  ProjectApplicationController.applyToProject
);
router.patch(
  "/applications/:id/cancel",
  authController.restrictTo("student"),
  ProjectApplicationController.cancelApplication
);

//routes for TEacher

router.get(
  "/projects/:id/applications",
  authController.restrictTo("teacher", "admin"),
  ProjectApplicationController.getProjectApplications
);

// Accepter une candidature
router.post(
  "/applications/:id/accept",
  authController.restrictTo("teacher", "admin"),
  ProjectApplicationController.acceptApplication
);

// Rejeter une candidature
router.post(
  "/applications/:id/reject",
  authController.restrictTo("teacher", "admin"),
  ProjectApplicationController.rejectApplication
);

module.exports = router;
