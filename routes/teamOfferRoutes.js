const express = require("express");
const teamOfferController = require("../controllers/teamOfferController");
const authController = require("../controllers/authController");
const {
  validateTeamOffer,
  validateUpdateTeamOffer,
} = require("../utils/teamOfferValidation");
const {
  isTeamCompositionActive,
} = require("../controllers/teamCompositionSettingsController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .post(
    authController.restrictTo("student"),
    isTeamCompositionActive,
    validateTeamOffer,
    teamOfferController.createTeamOffer
  )
  .get(
    authController.restrictTo("student"),
    isTeamCompositionActive,
    teamOfferController.getAllTeamOffers
  );

router
  .route("/myTeamOffer")
  .get(
    authController.restrictTo("student"),
    isTeamCompositionActive,
    teamOfferController.getMyTeamOffer
  );

router
  .route("/:id")
  .get(
    authController.restrictTo("student", "teacher"),
    teamOfferController.getTeamOffer
  )
  .patch(
    authController.restrictTo("student"),
    isTeamCompositionActive,
    validateUpdateTeamOffer,
    teamOfferController.updateTeamOffer
  )
  .delete(
    authController.restrictTo("student"),
    isTeamCompositionActive,
    teamOfferController.deleteTeamOffer
  );

router
  .route("/:id/deleteTeamMember")
  .delete(
    authController.restrictTo("student"),
    isTeamCompositionActive,
    teamOfferController.deleteTeamMember
  );

module.exports = router;
