const express = require("express");
const authController = require("../controllers/authController.js");
const e = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { verifyToken, verifyResetCookie } = require("../middlewares/authMiddleware"); //midelware verification of token that we can use in other routes later

router.post(
  "/forgot-password",
  body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
  authController.forgotPassword
);

router.post(
  "/verify-otp",
  body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
  body("otp")
    .isLength({ min: 4, max: 4 })
    .withMessage("L'OTP doit avoir 4 chiffres")
    .isNumeric()
    .withMessage("L'OTP doit être numérique"),
  authController.verifyOtp
);

router.post(
  "/reset-password",
  verifyResetCookie,
  body("password")
    .isLength({ min: 8 })
    .withMessage("8 caractères minimum")
    .matches(/[A-Z]/)
    .withMessage("Au moins une majuscule")
    .matches(/[0-9]/)
    .withMessage("Au moins un chiffre"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Les mots de passe ne correspondent pas"),
  authController.resetPassword
);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
module.exports = router;
