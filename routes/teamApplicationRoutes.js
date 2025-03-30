const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const prisma = require("../prisma/prismaClient");
const teamApplicationController = require("../controllers/teamApplicationController");
const { applyToOffer , getTeamApplications, updateApplicationStatus} = require("../controllers/teamApplicationController");
const isTeamMember = require("../middlewares/isTeamMember");
const isTeamLeader = require("../middlewares/isLeader");
router.use(authController.protect, authController.restrictTo("student"));
router.post("/team-offers/:teamOfferId/applications", applyToOffer);

router.get(
  "/team-offers/:teamOfferId/applications",
  isTeamMember,
  getTeamApplications
);

router.patch(
  "/team-offers/:teamOfferId/applications/:applicationId",
  isTeamLeader,
  updateApplicationStatus
);

module.exports = router;
