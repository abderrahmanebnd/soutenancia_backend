const express = require("express");
const router = express.Router();
const specialityController = require("../controllers/specialityController");
const authController = require("../controllers/authController");

router
  .route("/")
  .get(authController.protect, specialityController.getAllSpecialities);

router.use(authController.protect); // TODO:restrict this to admin
router
  .route("/")
  .post(
    authController.restrictTo("admin"),
    specialityController.createSpeciality
  );

router
  .route("/:id")
  .get(specialityController.getSpecialityById)
  .patch(specialityController.updateSpeciality)
  .delete(specialityController.deleteSpeciality);

module.exports = router;
