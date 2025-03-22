const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync.js");
const prisma = require("../prisma/prismaClient.js");
const bcrypt = require("bcryptjs");
const emailService = require("../services/emailService.js");
const { validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const prismaRaw = new PrismaClient();

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
    return res.status(400).json({
      status: "fail",
      message: "Role must be either student, teacher or entreprise",
    });
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
    return res.status(400).json({
      status: "fail",
      message: "Please provide email and password",
    });
  }

  // Fetch user and include the Student model
  const user = await prismaRaw.user.findUnique({
    where: { email },
    select: {
      password: true,
      id: true,
      email: true,
      role: true,

      Student: { include: { skills: true } }, // Needed for computed property
    },
  });

  if (!user || !(await prisma.user?.correctPassword(password, user.password))) {
    return res.status(401).json({
      status: "fail",
      message: "Incorrect email or password",
    });
  }

  user.password = undefined;
  createSendToken(user, 200, res);
});

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Email sent if user exists" });
    }
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpHash: otpHash, resetOtpExpiry: otpExpiry },
    });

    await emailService.sendOTP(email, otp);
    res.status(200).json({ message: "otp has been sent to your email" });
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    res
      .status(500)
      .json({ message: "Une erreur est survenue, veuillez réessayer" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetOtpHash) {
      return res.status(404).json({ message: "code not valid or expired" });
    }
    const isValidOtp = await bcrypt.compare(otp, user.resetOtpHash);
    if (!isValidOtp || user.resetOtpExpiry < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetOtpHash: null, resetOtpExpiry: null },
      });
      return res.status(400).json({ message: "code not valid or expired" });
    }
    const otpToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_RESET_EXPIRES_IN,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpHash: null, resetOtpExpiry: null },
    });

    res.cookie("resetToken", otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "Code validé",
    });
  } catch (error) {
    console.log("error verifying the otp", error);
    res.status(500).json({ message: "error server" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const userId = req.userId; // recupere l'id du user

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    const { password, confirmPassword } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    //delete the cookie
    res.clearCookie("resetToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      sameSite: "strict",
    });
    res.status(200).json({ message: "password changed" });
  } catch (error) {
    console.error("error in password changing ", error);
    res.status(500).json({ message: "error try later" });
  }
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it is exists

  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({
      status: "fail",
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) Verification token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const freshUser = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { Student: true },
  });

  if (!freshUser)
    return res.status(401).json({
      status: "fail",
      message: "The user belonging to this token does no longer exist.",
    });

  // Grant access to protected route
  req.user = freshUser;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};
