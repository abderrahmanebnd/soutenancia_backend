const { body } = require("express-validator");

exports.validateTeamOffer = [
  body("title")
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
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
