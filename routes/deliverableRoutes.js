// routes/deliverableRoutes.js

const express = require("express");
const router = express.Router({ mergeParams: true });

const deliverableController = require("../controllers/deliverableController");
const authController = require("../controllers/authController");
const { protect, restrictTo } = authController;

router.use(protect);

router
  .route("/")
  .post(
    restrictTo("teacher", "student"),
    deliverableController.createDeliverable
  );

router
  .route("/:deliverableId")
  .delete(
    restrictTo("teacher", "student"),
    deliverableController.deleteDeliverable
  );

module.exports = router;
