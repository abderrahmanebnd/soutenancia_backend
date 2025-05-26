const express = require("express");
const router = express.Router({ mergeParams: true });

const noteController = require("../controllers/noteController");
const authController = require("../controllers/authController");
const { protect } = authController;

router.use(protect);

router
  .route("/")
  .post(noteController.createNote)
  .get(noteController.getNotesBySprint);

router.route("/:noteId").delete(noteController.deleteNote);

module.exports = router;
