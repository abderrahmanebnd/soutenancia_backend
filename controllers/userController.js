const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync.js");
const prisma = require("../prisma/prismaClient.js");

exports.getMe = catchAsync(async (req, res, next) => {
  // Retrieve the token from cookies
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      status: "fail",
      message: "You are not logged in. Please log in to get access.",
    });
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log("decoded", decoded);
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      Student: {
        select: {
          id: true,
          speciality: true,
          enrollmentNumber: true,
          year: true,
          isLeader: true,
          isInTeam: true,
          customSkills: true,
          isCompletedProfile: true,
          skills: {
            select: {
              skill: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }, // Needed for computed property
    },
  });

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "The user belonging to this token does no longer exist.",
    });
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
});
