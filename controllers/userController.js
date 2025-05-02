const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync.js");
const prisma = require("../prisma/prismaClient.js");
const bcrypt = require("bcryptjs");
const { buildPrismaQuery } = require("../utils/apiFeatures");
const genericController = require("./genericController");

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

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      Student: {
        select: {
          id: true,
          speciality: true,
          enrollmentNumber: true,
          isLeader: true,
          isInTeam: true,

          customSkills: true,
          isCompletedProfile: true,
          TeamMember: {
            select: {
              teamOfferId: true,
            },
          },
          TeamOffer: {
            select: {
              id: true,
              assignedProjectId: true,
            },
          },
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
      },
      Teacher: true,
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

exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "please provide all required fields",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "Cet email est déjà utilisé",
      });
    }

    const validRoles = ["student", "teacher", "admin", "entreprise"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        status: "fail",
        message: "Rôle invalide",
      });
    }

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName: lastName || "",
        email,
        password: await bcrypt.hash(password, 12),
        role: role || "student",
      },
    });

    if (newUser.role === "student") {
      const { year, specialityId } = req.body;

      await prisma.student.create({
        data: {
          userId: newUser.id,
          year: year || null,
          specialityId: specialityId || null,
        },
      });
    }

    if (newUser.role === "teacher") {
      await prisma.teacher.create({
        data: {
          userId: newUser.id,
          department: req.body.department || null,
        },
      });
    }

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      status: "error",
      message: "an error occurred while creating user. Please try again later.",
    });
  }
};

exports.getAllUsers = genericController.createListHandler("user", {
  include: {
    Student: {
      include: {
        speciality: true,
      },
    },
    Teacher: true,
  },
  defaultSort: { createdAt: "desc" },
});

exports.getUser = genericController.createGetOneHandler("user", {
  include: {
    Student: {
      include: {
        speciality: true,
      },
    },
    Teacher: true,
  },
});

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      role,
      enrollmentNumber,
      specialityId,
      department,
      title,
    } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        Student: true,
        Teacher: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return res.status(400).json({
          status: "fail",
          message: "Email already in use",
        });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (
      role &&
      ["student", "teacher", "admin", "entreprise"].includes(role) &&
      role !== existingUser.role
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "if you want to change the role delete the user and create a new one",
      });
    }

    if (existingUser.role === "student" && existingUser.Student) {
      if (
        enrollmentNumber &&
        enrollmentNumber !== existingUser.Student.enrollmentNumber
      ) {
        const enrollmentExists = await prisma.student.findUnique({
          where: { enrollmentNumber },
        });

        if (enrollmentExists && enrollmentExists.userId !== existingUser.id) {
          return res.status(400).json({
            status: "fail",
            message: "This enrollment number is already in use by another user",
          });
        }
      }

      if (enrollmentNumber || specialityId !== undefined) {
        await prisma.student.update({
          where: { userId: existingUser.id },
          data: {
            ...(enrollmentNumber && { enrollmentNumber }),
            ...(specialityId !== undefined && { specialityId }),
          },
        });
      }
    } else if (existingUser.role === "teacher" && existingUser.Teacher) {
      if (department !== undefined || title !== undefined) {
        await prisma.teacher.update({
          where: { userId: existingUser.id },
          data: {
            ...(department !== undefined && { department }),
            ...(title !== undefined && { title }),
          },
        });
      }
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        Student: {
          include: {
            speciality: true,
          },
        },
        Teacher: true,
      },
    });
    //afficher sans le mot de passe
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json({
      status: "success",
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      status: "error",
      message: "an error occurred while updating user. Please try again later.",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    // we cant delete an admin user
    if (id === req.user.id) {
      return res.status(400).json({
        status: "fail",
        message: "You can't delete your own account",
      });
    }

    await prisma.user.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      status: "error",
      message: "an error occurred while deleting user. Please try again later.",
      details: error.message,
    });
  }
};

exports.updateMe = async (req, res) => {
  try {
    if (req.body.password) {
      return res.status(400).json({
        status: "fail",
        message:
          "This route is not for password updates. Please use /updateMyPassword.",
      });
    }
    const filteredBody = {};
    const allowedFields = ["firstName", "lastName"];

    Object.keys(req.body).forEach((field) => {
      if (allowedFields.includes(field)) {
        filteredBody[field] = req.body[field];
      }
    });

    if (req.user.role === "student" && req.body.customSkills) {
      await prisma.student.update({
        where: { userId: req.user.id },
        data: {
          customSkills: req.body.customSkills,
        },
      });
    } else if (
      req.user.role === "teacher" &&
      (req.body.department !== undefined ||
        req.body.bio !== undefined ||
        req.body.title !== undefined)
    ) {
      await prisma.teacher.update({
        where: { userId: req.user.id },
        data: {
          ...(req.body.department !== undefined && {
            department: req.body.department,
          }),
          ...(req.body.bio !== undefined && { bio: req.body.bio }),
          ...(req.body.title !== undefined && { title: req.body.title }),
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: filteredBody,
      include: {
        Student: {
          include: {
            speciality: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        Teacher: true,
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      status: "success",
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      status: "error",
      message: "an error occurred while updating user. Please try again later.",
    });
  }
};

exports.updateMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message:
          "please provide current password, new password and confirm password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "fail",
        message: "new password and confirm password do not match",
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect current password",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      status: "error",
      message:
        "an error occurred while updating password. Please try again later.",
    });
  }
};
