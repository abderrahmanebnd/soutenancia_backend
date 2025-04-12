const express = require("express");

const teamCompositionSettings = require("../controllers/teamCompositionSettingsController");

const authController = require("../controllers/authController");

const router = express.Router();

router.use(
  authController.protect,
  authController.restrictTo("admin", "student")
);

router.route("/").get(teamCompositionSettings.getTeamCompositionSettings);

router.use(authController.restrictTo("admin"));

router.post("/", teamCompositionSettings.createTeamCompositionSettings);
router
  .route("/:id")
  .get(teamCompositionSettings.getTeamCompositionSettingsById)
  .delete(teamCompositionSettings.deleteTeamCompositionSettings)
  .patch(teamCompositionSettings.updateTeamCompositionSettings);

module.exports = router;
