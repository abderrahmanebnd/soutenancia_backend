const express = require("express");
const prisma = require("../prisma/prismaClient");
const userController = require("../controllers/userController");
const router = express.Router();

router.get("/me", userController.getMe);
module.exports = router;
