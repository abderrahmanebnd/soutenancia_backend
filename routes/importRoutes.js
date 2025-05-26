const express = require("express");
const router = express.Router();
const importController = require("../controllers/importController");
const authController = require("../controllers/authController");
const { uploadExcel } = require("../middlewares/multer");

// Protection et restriction admin pour toutes les routes
router.use(authController.protect);
router.use(authController.restrictTo("admin"));

// Routes d'import
router.post("/students", uploadExcel, importController.importStudents);
router.post("/teachers", uploadExcel, importController.importTeachers);

module.exports = router;