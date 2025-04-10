const { validationResult } = require("express-validator");
const prisma = require("../prisma/prismaClient");

exports.createTeamOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    max_members,
    description,
    general_required_skills,
    specific_required_skills,
  } = req.body;

  const leader_id = req.user.Student.id;

  try {
    const existingTeamOffer = await prisma.teamOffer.findUnique({
      where: { leader_id },
    });

    if (existingTeamOffer) {
      return res
        .status(400)
        .json({ error: "You already have a team offer created." });
    }

    const leader = req.user.Student;

    if (!leader) {
      return res.status(404).json({ error: "Leader not found" });
    }

    const existingMember = await prisma.teamMember.findFirst({
      where: { studentId: leader_id },
    });

    if (existingMember) {
      return res.status(400).json({
        error: "You are already a member of a team",
      });
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
          select: { name: true },
        },
      },
    });
    // Create a team member for the leader

    await prisma.teamMember.create({
      data: {
        studentId: leader_id,
        teamOfferId: teamOffer.id,
      },
    });
    // cancel the student's application when he want to create an offer and be the leader.
    await prisma.teamApplication.updateMany({
      where: { studentId: leader_id, status: "pending" },
      data: { status: "canceled" },
    });

    await prisma.student.update({
      where: { id: leader_id },
      data: { isLeader: true },
    });

    res.status(201).json(teamOffer);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateTeamOffer = async (req, res) => {
  // Validate incoming request

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const leader_id = req.user.Student.id;
  const {
    new_leader_id,
    title,
    max_members,
    description,
    status,
    general_required_skills,
    specific_required_skills,
  } = req.body;

  try {
    // Check if team offer exists
    const existingTeamOffer = await prisma.teamOffer.findUnique({
      where: { id },
    });

    if (!existingTeamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }

    // only the leader can update the team offer
    if (existingTeamOffer.leader_id !== leader_id) {
      return res
        .status(403)
        .json({ error: "You are not the leader of this team offer" });
    }

    const updateData = {};

    // Add fields if provided
    if (new_leader_id !== undefined) updateData.leader_id = new_leader_id;
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (max_members !== undefined) updateData.max_members = max_members;
    if (description !== undefined) updateData.description = description;
    if (specific_required_skills !== undefined)
      updateData.specific_required_skills = specific_required_skills;

    // Handle general skills update
    if (general_required_skills) {
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

      updateData.general_required_skills = {
        set: skills.map((skill) => ({ id: skill.id })), // Overwrite skills
      };
    }

    // Perform the update
    const updatedTeamOffer = await prisma.teamOffer.update({
      where: { id },
      data: updateData,
      include: {
        general_required_skills: {
          select: { name: true },
        },
      },
    });

    // New leader logic
    if (new_leader_id !== undefined && new_leader_id !== leader_id) {
      await prisma.student.update({
        where: { id: leader_id },
        data: { isLeader: false },
      });
    }

    res.status(200).json(updatedTeamOffer);
  } catch (error) {
    console.error("Error updating team offer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getTeamOffer = async (req, res) => {
  const { id } = req.params;
  try {
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id },
      include: {
        general_required_skills: {
          select: { name: true },
        },
        leader: {
          select: {
            year: true,
            speciality: true,
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        TeamMembers: {
          select: {
            student: {
              select: {
                year: true,
                speciality: true,
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        _count: {
          select: { TeamMembers: true },
        },
      },
    });
    if (!teamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }
    res.status(200).json(teamOffer);
  } catch (error) {
    console.error("Error getting team offer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getMyTeamOffer = async (req, res) => {
  const leader_id = req.user.Student.id;
  try {
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { leader_id },
      include: {
        general_required_skills: {
          select: { name: true },
        },
        TeamMembers: {
          select: {
            student: true,
          },
        },
      },
    });
    if (!teamOffer) {
      return res.status(200).json({ error: "Team offer not found" });
    }
    res.status(200).json(teamOffer);
  } catch (error) {
    console.error("Error getting team offer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteTeamOffer = async (req, res) => {
  const { id } = req.params;
  const leader_id = req.user.Student.id;
  try {
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id },
      include: {
        TeamMembers: true, // Include team members to check if there are any
      },
    });

    if (!teamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }

    if (teamOffer.leader_id !== leader_id) {
      return res
        .status(403)
        .json({ error: "You are not the leader of this team offer" });
    }

    if (teamOffer.TeamMembers.length > 1) {
      return res
        .status(400)
        .json({ error: "You cannot delete a team offer with members" });
    }

    if (teamOffer)
      await prisma.teamOffer.delete({
        where: { id },
      });

    await prisma.student.update({
      where: { id: leader_id },
      data: { isLeader: false, isInTeam: false },
    });
    // Remove the leader from the team members table
    await prisma.teamMember.delete({
      where: { studentId: leader_id },
    });
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting team offer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAllTeamOffers = async (req, res) => {
  try {
    const teamOffers = await prisma.teamOffer.findMany({
      include: {
        _count: {
          select: { TeamMembers: true },
        },
        general_required_skills: {
          select: { name: true },
        },
      },
    });
    res.status(200).json(teamOffers);
  } catch (error) {
    console.error("Error getting team offers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
