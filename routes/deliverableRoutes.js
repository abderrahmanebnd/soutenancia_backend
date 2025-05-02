// routes/deliverableRoutes.js

const express = require("express");
const router = express.Router({ mergeParams: true });

const deliverableController = require("../controllers/deliverableController");
const authController = require("../controllers/authController");
const {
  uploadSingle,
  cleanupOnError,
  handleMulterError,
} = require("../middlewares/multer");
const { protect, restrictTo } = authController;

router.use(protect, restrictTo("teacher", "student"));

router
  .route("/")
  .post(
    uploadSingle,
    cleanupOnError,
    handleMulterError,
    deliverableController.addDeliverable
  )
  .get(deliverableController.getDeliverables);

router.route("/:deliverableId").delete(deliverableController.deleteDeliverable);

module.exports = router;
