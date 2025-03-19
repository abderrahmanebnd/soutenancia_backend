const express = require("express");
const teamOfferController = require("../controllers/teamOfferController");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/").post(teamOfferController.createTeamOffer);

module.exports = router;
