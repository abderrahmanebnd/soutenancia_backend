const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const router = express.Router();

router.use(authController.protect);

// Routes pour user
router.get("/me", userController.getMe);
router.patch("/updateMe", userController.updateMe);
router.patch("/updateMyPassword", userController.updateMyPassword);

//route pour ladmin
router.use(authController.restrictTo("admin"));

router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
