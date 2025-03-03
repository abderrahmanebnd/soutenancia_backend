const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync.js");
const AppError = require("../utils/appError.js");
const prisma = require("../prisma/prismaClient.js");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    path: "/",
  };

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    enrollmentNumber,
    year,
    speciality,
  } = req.body;

  if (role && !["student", "teacher", "entreprise"].includes(role)) {
    return next(
      new AppError("Role must be one of: student, teacher, or entreprise", 400)
    );
  }

  const newUser = await prisma.user.signup({
    data: {
      firstName,
      lastName,
      email,
      password,
      role,
      Student:
        role === "student"
          ? {
              create: {
                enrollmentNumber,
                year,
                speciality,
              },
            }
          : undefined,
    },
  });

  createSendToken(newUser, 201, res);
});
