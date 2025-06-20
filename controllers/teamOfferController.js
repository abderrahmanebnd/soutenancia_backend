const { validationResult } = require("express-validator");
const prisma = require("../prisma/prismaClient");
const emailService = require("../services/emailService.js");

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
        speciality: {
          connect: { id: leader.specialityId }, // Connect speciality by ID
        },
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
      data: { isLeader: true, isInTeam: true },
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
      include: {
        _count: {
          select: { TeamMembers: true },
        },
      },
    });

    if (!existingTeamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }

    if (existingTeamOffer.leader_id !== leader_id) {
      return res
        .status(403)
        .json({ error: "You are not the leader of this team offer" });
    }

    // Vérifier si max_members est modifié
    if (max_members !== undefined) {
      const currentMembersCount = existingTeamOffer._count.TeamMembers;

      //First Case
      if (max_members < currentMembersCount) {
        return res.status(400).json({
          error: `Cannot reduce max members to ${max_members} as the team already has ${currentMembersCount} members`,
        });
      }

      //Second case
      if (
        existingTeamOffer.status === "closed" &&
        max_members > currentMembersCount
      ) {
        // Force le statut à "open" même si status n'était pas dans les champs à mettre à jour
        status = "open";
      }
    }
    // only the leader can update the team offer
    if (existingTeamOffer.leader_id !== leader_id) {
      return res
        .status(403)
        .json({ error: "You are not the leader of this team offer" });
    }

    if (max_members !== undefined) {
      const currentMembersCount = existingTeamOffer._count.TeamMembers;

      //First Case
      if (max_members < currentMembersCount) {
        return res.status(400).json({
          error: `Cannot reduce max members to ${max_members} as the team already has ${currentMembersCount} members`,
        });
      }

      //Second Case
      if (
        existingTeamOffer.status === "closed" &&
        max_members > currentMembersCount
      ) {
        // Force le statut à "open" même si status n'était pas dans les champs à mettre à jour
        status = "open";
      }
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
        data: { isLeader: false, isInTeam: false },
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
            id: true,
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
                id: true,
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
        _count: {
          select: { TeamMembers: true },
        },

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
    res.status(204).json({
      status: "success",
      data: null,
    });
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

exports.deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const leader_id = req.user.Student.id;

    const ExTeamOffer = await prisma.teamOffer.findUnique({
      where: { id },
    });

    if (!ExTeamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }

    if (ExTeamOffer.leader_id !== leader_id) {
      return res.status(403).json({ error: "You are not the team leader" });
    }

    // Vérification de l'existence de l'étudiant
    const ExStudent = await prisma.student.findUnique({
      where: { id: memberId },
    });

    if (!ExStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Vérification de l'existence du membre de l'équipe
    const ExTeamMember = await prisma.teamMember.findFirst({
      where: { studentId: memberId, teamOfferId: id },
    });

    if (!ExTeamMember) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const teamOffer = await tx.teamOffer.findUnique({
        where: { id },
        include: {
          TeamMembers: true,
          leader: {
            include: {
              user: true,
            },
          },
        },
      });
      const student = await tx.student.findFirst({
        where: { id: memberId },
        include: {
          user: true,
        },
      });

      await tx.teamMember.delete({
        where: { id: ExTeamMember.id },
      });
      //updating the flag isInTeam
      await tx.student.update({
        where: { id: memberId },
        data: { isInTeam: false },
      });

      // changing the status of the offer if closed
      if (teamOffer.status === "closed") {
        await tx.teamOffer.update({
          where: { id },
          data: {
            status: "open",
          },
        });
      }

      // rejecting the application of the deleted member in this offer
      await tx.teamApplication.updateMany({
        where: {
          teamOfferId: id,
          studentId: memberId,
        },
        data: { status: "rejected" },
      });

      // updating the status of the canceled applications of the deleted member
      const canceledApplications = await tx.teamApplication.findMany({
        where: {
          studentId: memberId,
          status: "canceled",
          NOT: { teamOfferId: id },
        },
        include: {
          teamOffer: {
            include: {
              TeamMembers: true,
            },
          },
        },
      });
      // filter the applications that are not full and have an open status
      // keep this solution its better than just verfying the status
      const applicationToUpdate = canceledApplications.filter((app) => {
        return (
          app.teamOffer.TeamMembers.length < app.teamOffer.max_members &&
          app.teamOffer.status === "open"
        );
      });

      for (const app of applicationToUpdate) {
        await tx.teamApplication.update({
          where: { id: app.id },
          data: { status: "pending" },
        });
      }
      return {
        teamOffer,
        student,
        reactivatedCount: applicationToUpdate.length,
      };
    });

    //sending the email to the deleted student
    if (result && result.student && result.student.user) {
      const studentName = `${result.student.user.firstName} ${
        result.student.user.lastName || ""
      }`;
      const leaderName = `${result.teamOffer.leader.user.firstName} ${
        result.teamOffer.leader.user.lastName || ""
      }`;

      await emailService
        .EmailToDeletedStudent(
          result.student.user.email,
          studentName,
          result.teamOffer.title,
          leaderName
        )
        .catch((error) => console.log("Email error", error));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    console.error("Error deleting team Member:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAllCompletedTeams = async (req, res) => {
  try {
    const completedTeams = await prisma.teamOffer.findMany({
      where: { status: "closed", assignedProjectId: null },
      include: {
        leader: {
          include: {
            user: true,
          },
        },
        TeamMembers: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    res.status(200).json({
      status: "success",
      results: completedTeams.length,
      data: completedTeams,
    });
  } catch (error) {
    console.error("Error getting completed teams:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
