const prisma = require("../prisma/prismaClient.js");

exports.getAllSkills = async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: "asc" },
    });
    res.status(200).json({
      status: "success",
      results: skills.length,
      data: skills,
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).json({
      status: "error",
      message:
        "an error occurred while fetching skills. Please try again later.",
    });
  }
};

exports.getSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        students: {
          select: {
            student: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        teamOffers: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
    if (!skill) {
      return res.status(404).json({
        status: "fail",
        message: "Skill not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: skill,
    });
  } catch (error) {
    console.error("Error fetching skill:", error);
    res.status(500).json({
      status: "error",
      message:
        "an error occurred while fetching skill. Please try again later.",
    });
  }
};

exports.createSkill = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        status: "fail",
        message: "Skill name is required",
      });
    }
    const skillExist = await prisma.skill.findUnique({
      where: { name },
    });
    if (skillExist) {
      return res.status(400).json({
        status: "fail",
        message: "Skill already exists",
      });
    }
    const skill = await prisma.skill.create({
      data: { name },
    });
    res.status(201).json({
      status: "success",
      data: skill,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message:
        "an error occurred while creating skill. Please try again later.",
    });
  }
};

exports.updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        status: "fail",
        message: "Skill name is required",
      });
    }
    const existingSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existingSkill) {
      return res.status(404).json({
        status: "fail",
        message: "Skill not found",
      });
    }
    if (name !== existingSkill.name) {
      const nameExists = await prisma.skill.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(400).json({
          status: "fail",
          message: "Skill name already exists",
        });
      }
    }
    const updatedSkill = await prisma.skill.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({
      status: "success",
      data: updatedSkill,
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).json({
      status: "error",
      message:
        "an error occurred while updating skill. Please try again later.",
    });
  }
};

// i had 2 possibilty , the admin can delete the skill if it is not used in any team offer or by any student ,
// or delete the skill and all the students and team offers that are using this skill
// i will go with the second option
exports.deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existingSkill) {
      return res.status(404).json({
        status: "fail",
        message: "Skill not found",
      });
    }

    // iWill use a transaction to ensure that all the operations are done
    await prisma.$transaction(async (tx) => {
      const teamsWithSkill = await tx.teamOffer.findMany({
        where: {
          general_required_skills: {
            some: { id },
          },
        },
        select: { id: true },
      });

      for (const team of teamsWithSkill) {
        await tx.teamOffer.update({
          where: { id: team.id },
          data: {
            general_required_skills: {
              disconnect: { id },
            },
          },
        });
      }
      // i know that in the schema skill is ondelete cascade but i want to be more sure xD
      await tx.studentSkill.deleteMany({
        where: { skillId: id },
      });

      await tx.skill.delete({
        where: { id },
      });
    });

    res.status(200).json({
      status: "success",
      message: "Skill successfully deleted with all its relationships",
    });
  } catch (error) {
    console.error("Error deleting skill:", error);
    res.status(500).json({
      status: "error",
      message:
        "An error occurred while deleting skill. Please try again later.",
    });
  }
};
