const prisma = require("../prisma/prismaClient");

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        teachers,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
