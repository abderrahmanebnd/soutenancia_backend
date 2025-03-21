const express = require("express");
const teamOfferController = require("../controllers/teamOfferController");
const authController = require("../controllers/authController");
const { validateTeamOffer } = require("../utils/teamOfferValidation");

const router = express.Router();
// Protect all routes after this middleware
router.use(authController.protect, authController.restrictTo("student"));

router.route("/").post(validateTeamOffer, teamOfferController.createTeamOffer);

router.route("/:id").patch(teamOfferController.updateTeamOffer);
module.exports = router;
