const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync.js");
const AppError = require("../utils/appError.js");
const prisma = require("../prisma/prismaClient.js");

exports.getMe = catchAsync(async (req, res, next) => {
  // Retrieve the token from cookies
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      Student: true,
    },
  });

  if (!user) {
    return next(new AppError("User no longer exists.", 401));
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
});
