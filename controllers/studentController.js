const catchAsync = require("../utils/catchAsync.js");
const prisma = require("../prisma/prismaClient.js");

exports.getAllSkills = catchAsync(async (req, res, next) => {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true },
  });

  res.status(200).json({
    status: "success",
    data: skills,
  });
});

exports.addSkills = catchAsync(async (req, res, next) => {
  const { customSkill, generalSkills } = req.body;

  const studentId = req.user.Student.id;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { skills: true },
  });

  if (!student) {
    return res.status(404).json({
      status: "fail",
      message: "Student not found",
    });
  }

  // Handle custom skills
  let existingCustomSkills = Array.isArray(student.customSkills)
    ? student.customSkills
    : [];
  if (customSkill && !existingCustomSkills.includes(customSkill)) {
    existingCustomSkills.push(customSkill);
  }

  // Handle general skills
  if (Array.isArray(generalSkills) && generalSkills.length > 0) {
    for (const skillName of generalSkills) {
      let skill = await prisma.skill.findUnique({ where: { name: skillName } });

      // TODO : remove this
      if (!skill) {
        skill = await prisma.skill.create({ data: { name: skillName } });
      }

      // Check if the student already has this skill
      const existingSkill = await prisma.studentSkill.findUnique({
        where: { studentId_skillId: { studentId, skillId: skill.id } },
      });

      if (!existingSkill) {
        await prisma.studentSkill.create({
          data: { studentId, skillId: skill.id },
        });
      }
    }
  }

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: { customSkills: existingCustomSkills },
    select: {
      id: true,
      speciality: true,
      customSkills: true,
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
  });
  res.status(200).json({
    status: "success",
    data: updatedStudent,
  });
});

// TODO - add protect middleware to restrict access to only authenticated users
// TODO - add restrictTo middleware to restrict access to only students
