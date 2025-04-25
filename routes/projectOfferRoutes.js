const express = require("express");
const router = express.Router();

const projectOfferController = require("../controllers/projectOfferController");
const authController = require("../controllers/authController");

router.use(authController.protect);

router.route("/").get(projectOfferController.getAllProjectOffers);

router
  .route("/")
  .post(
    authController.restrictTo("teacher", "admin"),
    projectOfferController.createProjectOffer
  );

router
  .route("/myProjectOffer")
  .get(
    authController.restrictTo("teacher", "admin"),
    projectOfferController.getMyProjectOffer
  );

router
  .route("/history")
  .get(
    authController.restrictTo("teacher", "admin"),
    projectOfferController.getProjectOfferHistory
  );

router
  .route("/:id")
  .patch(
    authController.restrictTo("teacher", "admin"),
    projectOfferController.updateProjectOffer
  )
  .get(
    authController.restrictTo("teacher", "admin", "student"),
    projectOfferController.getProjectOffer
  )
  .delete(
    authController.restrictTo("teacher", "admin"),
    projectOfferController.deleteProjectOffer
  );

module.exports = router;
