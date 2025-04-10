const express = require("express");
const teamOfferController = require("../controllers/teamOfferController");
const authController = require("../controllers/authController");
const {
  validateTeamOffer,
  validateUpdateTeamOffer,
} = require("../utils/teamOfferValidation");

const router = express.Router();
// Protect all routes after this middleware
router.use(authController.protect, authController.restrictTo("student"));

router
  .route("/")
  .post(validateTeamOffer, teamOfferController.createTeamOffer)
  .get(teamOfferController.getAllTeamOffers);

router.route("/myTeamOffer").get(teamOfferController.getMyTeamOffer);

router
  .route("/:id")
  .patch(validateUpdateTeamOffer, teamOfferController.updateTeamOffer)
  .get(teamOfferController.getTeamOffer)
  .delete(teamOfferController.deleteTeamOffer);

router
  .route("/:id/deleteTeamMember")
  .delete(teamOfferController.deleteTeamMember);
module.exports = router;
