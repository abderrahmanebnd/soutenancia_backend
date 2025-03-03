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

  // Validate role value
  if (role && !["student", "teacher", "entreprise"].includes(role)) {
    return next(
      new AppError("Role must be one of: student, teacher, or entreprise", 400)
    );
  }

  // Create the user and, if role is student, also create a Student record.

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

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  // 2) Check if the user exists and the password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user?.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401)); //unauthorized
  }
  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Adjust for cross-site cookies
    path: "/",
  });
  res.status(200).json({ status: "success" });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it is exists

  const token = req.cookies.jwt;
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser)
    next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );

  // 4) Check if user changed password after the JWT token was issued

  if (freshUser?.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  } // iat is the time the token was issued

  // Grant access to protected route
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
