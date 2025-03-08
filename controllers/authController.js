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
  const token = signToken(user.id);
  const cookieOptions = {
    httpOnly: true,
    // secure: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    // sameSite: "Lax",
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

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // Fetch user and include the Student model
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      Student: { include: { skills: true } }, // Needed for computed property
    },
  });

  if (!user || !(await prisma.user?.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, res);
});
