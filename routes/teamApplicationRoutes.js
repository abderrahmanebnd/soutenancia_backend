const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const prisma = require("../prisma/prismaClient");
const teamApplicationController = require("../controllers/teamApplicationController");
const {
  applyToOffer,
  getTeamApplications,
  updateApplicationStatus,
} = require("../controllers/teamApplicationController");
const isTeamMember = require("../middlewares/isTeamMember");
const isTeamLeader = require("../middlewares/isLeader");
router.use(authController.protect, authController.restrictTo("student"));
router.post("/team-offers/:teamOfferId/applications", applyToOffer);

router.get("/", getTeamApplications);

router.patch("/:applicationId", updateApplicationStatus);

module.exports = router;
