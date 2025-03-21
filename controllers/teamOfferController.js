const { validationResult } = require("express-validator");
const prisma = require("../prisma/prismaClient");

exports.createTeamOffer = async (req, res) => {
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    leader_id,
    title,
    max_members,
    description,
    general_required_skills,
    specific_required_skills,
  } = req.body;

  try {
    const existingTeamOffer = await prisma.teamOffer.findUnique({
      where: { leader_id },
    });

    if (existingTeamOffer) {
      return res
        .status(400)
        .json({ error: "You already have a team offer created." });
    }
    const leader = await prisma.student.findUnique({
      where: { id: leader_id },
    });

    if (!leader) {
      return res.status(404).json({ error: "Leader not found" });
    }

    const skills = await prisma.skill.findMany({
      where: { name: { in: general_required_skills } },
    });

    if (skills.length !== general_required_skills.length) {
      const existingSkillNames = skills.map((s) => s.name);
      const missingSkills = general_required_skills.filter(
        (s) => !existingSkillNames.includes(s)
      );
      return res
        .status(400)
        .json({ error: `Skills not found: ${missingSkills.join(", ")}` });
    }

    const teamOffer = await prisma.teamOffer.create({
      data: {
        title,
        description,
        year: leader.year,
        speciality: leader.speciality,
        leader: {
          connect: { id: leader_id }, // Connect leader by ID
        },
        max_members,
        general_required_skills: {
          connect: skills.map((skill) => ({ id: skill.id })),
        },
        specific_required_skills: specific_required_skills || [],
      },
      include: {
        general_required_skills: {
          select: { name: true }, // Include general skills in the response
        }, // Include general skills in the response
      },
    });

    res.status(201).json(teamOffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// TODO: Add validation for the request body
// TODO: Add a route for the  updating the offer
// TODO: Add a route for the  getting the offer by id
// TODO: Add a route for the  getting all offers
