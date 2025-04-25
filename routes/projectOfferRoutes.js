const express = require("express");
const router = express.Router();

const projectOfferController = require("../controllers/projectOfferController");
const authController = require("../controllers/authController");

router.use(
  authController.protect,
  authController.restrictTo("teacher", "admin")
);

router
  .route("/")
  .post(projectOfferController.createProjectOffer)
  .get(projectOfferController.getAllProjectOffers);

router.route("/myProjectOffer").get(projectOfferController.getMyProjectOffer);

router.route("/history").get(projectOfferController.getProjectOfferHistory);

router
  .route("/:id")
  .patch(projectOfferController.updateProjectOffer)
  .get(projectOfferController.getProjectOffer)
  .delete(projectOfferController.deleteProjectOffer);

module.exports = router;
