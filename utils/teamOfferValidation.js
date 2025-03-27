const { body } = require("express-validator");

exports.validateTeamOffer = [
  body("title")
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("max_members")
    .isInt({ min: 1, max: 7 })
    .withMessage("Max members must be between 1 and 7"),
  body("description")
    .isString()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("general_required_skills")
    .isArray({ min: 1 })
    .withMessage("At least one general required skill is required"),
  body("specific_required_skills")
    .optional()
    .isArray()
    .withMessage("Specific required skills must be an array"),
];

exports.validateUpdateTeamOffer = [
  body("title").optional().isString().withMessage("Title must be a string"),
  body("max_members")
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage("Max members must be between 1 and 7"),
  body("status")
    .optional()
    .isString()
    .isIn(["open", "closed", "completed"])
    .withMessage("Status must be one of: open, closed, completed"),
  body("description")
    .optional()
    .isString()
    .isLength({ min: 10 })
    .withMessage("Description must be a string"),
  body("general_required_skills")
    .optional()
    .isArray()
    .withMessage("General required skills must be an array"),
  body("specific_required_skills")
    .optional()
    .isArray()
    .withMessage("Specific required skills must be an array"),
];
