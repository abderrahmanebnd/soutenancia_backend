const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  applyToOffer,
  getTeamApplications,
  updateApplicationStatus,
  getMyApplications,
} = require("../controllers/teamApplicationController");

router.use(authController.protect, authController.restrictTo("student"));

router.post("/team-offers/:teamOfferId/applications", applyToOffer);

router.get("/", getTeamApplications);
router.get("/myApplications", getMyApplications);
router.patch("/:applicationId", updateApplicationStatus);

module.exports = router;
