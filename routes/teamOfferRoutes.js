const express = require("express");
const { body, validationResult } = require("express-validator");
const teamOfferController = require("../controllers/teamOfferController");

const router = express.Router();

// Validation rules
const validateTeamOffer = [
  body("leader_id").notEmpty().withMessage("Leader ID is required"),
  body("title")
    .isString()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("max_members")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max members must be a positive integer"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("general_required_skills")
    .isArray({ min: 1 })
    .withMessage("At least one general required skill is required"),
  body("specific_required_skills")
    .optional()
    .isArray()
    .withMessage("Specific required skills must be an array"),
];

// Apply validation middleware before the controller
router.route("/").post(validateTeamOffer, teamOfferController.createTeamOffer);

module.exports = router;
