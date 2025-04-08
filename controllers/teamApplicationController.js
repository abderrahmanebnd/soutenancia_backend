const prisma = require("../prisma/prismaClient");

exports.applyToOffer = async (req, res) => {
  try {
    const { teamOfferId, message } = req.body;

    const student = req.user.Student;

    const existingMember = await prisma.teamMember.findFirst({
      where: { studentId: student.id },
    });
    if (existingMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of a team" });
    }

    const existingApplication = await prisma.teamApplication.findFirst({
      where: { studentId: student.id, teamOfferId: teamOfferId },
    });

    if (existingApplication) {
      return res
        .status(400)
        .json({ error: "You have already applied to this offer" });
    }

    const leaderTeamOffer = await prisma.teamOffer.findUnique({
      where: { leader_id: student.id },
    });
    if (leaderTeamOffer) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamOfferId: leaderTeamOffer.id },
      });
      if (teamMembers.length > 1) {
        return res.status(400).json({
          error: "you cannot apply if your team already has members",
        });
      }
      await prisma.teamOffer.delete({
        where: { id: leaderTeamOffer.id },
      });
    }
    //no need to mention the status beacause rak dayer pending default
    const application = await prisma.teamApplication.create({
      data: {
        studentId: student.id,
        message,
        teamOfferId: teamOfferId,
      },
    });
    return res
      .status(201)
      .json({ message: "Application submitted successfully.", application });
  } catch (error) {
    console.log("Error applying ", error);
    return res.status(500).json({ error: "internal server error" });
  }
};

exports.getTeamApplications = async (req, res) => {
  try {
    const userId = req.user.Student.id;
    const isMember = await prisma.teamMember.findFirst({
      where: { studentId: userId },
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of any team." });
    }
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: isMember.teamOfferId },
      include: {
        TeamApplication: {
          select: {
            id: true,
            message: true,
            status: true,
            student: {
              select: {
                id: true,
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
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      }, //include is like a join in sql
    });
    if (!teamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }
    if (!teamOffer) {
      return res.status(404).json({ error: "Team offer not found." });
    }
    return res.status(200).json({ applications: teamOffer.TeamApplication });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ error: "server error" });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const studentId = req.user.Student.id;
    const applications = await prisma.teamApplication.findMany({
      where: { studentId },
      include: {
        teamOffer: true,
      },
    });
    if (!applications) {
      return res.status(404).json({ error: "No applications found." });
    }
    return res.status(200).json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ error: "server error" });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const studentId = req.user.Student.id;

    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: {
        student: true,
        teamOffer: { include: { TeamMembers: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    const isLeader = application.teamOffer.leader_id === studentId;
    const isOwner = application.studentId === studentId;

    // Leader's permissions
    if (isLeader) {
      if (status !== "accepted" && status !== "rejected") {
        return res.status(400).json({
          error:
            "Leader can only accept or reject, status must be accepted or rejected.",
        });
      }

      if (application.status !== "pending") {
        return res.status(400).json({
          error:
            "Leader can only update applications that are currently pending.",
        });
      }
    }

    // Student's permissions
    else if (isOwner) {
      if (status !== "canceled" && status !== "pending") {
        return res.status(403).json({
          error: "You can only change your application to canceled or pending.",
        });
      }

      if (
        application.status === "accepted" ||
        application.status === "rejected"
      ) {
        return res.status(403).json({
          error:
            "You cannot update an application that has been accepted or rejected.",
        });
      }
    } else {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this application." });
    }

    // Leader: check if accepting
    if (status === "accepted") {
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamOfferId: application.teamOffer.id,
          studentId: application.studentId,
        },
      });

      if (existingMember) {
        return res.status(400).json({ error: "Already a team member" });
      }

      if (
        typeof application.teamOffer.max_members === "number" &&
        application.teamOffer.TeamMembers.length >=
          application.teamOffer.max_members
      ) {
        return res.status(400).json({ error: "Team is full" });
      }
    }

    const updatedApplication = await prisma.teamApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    if (status === "accepted") {
      await prisma.teamApplication.updateMany({
        where: {
          studentId: application.studentId,
          status: "pending",
          NOT: { id: applicationId },
        },
        data: { status: "canceled" },
      });

      await prisma.teamMember.create({
        data: {
          teamOfferId: application.teamOffer.id,
          studentId: application.studentId,
        },
      });
    }

    if (status === "rejected" || status === "canceled") {
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamOfferId: application.teamOffer.id,
          studentId: application.studentId,
        },
      });

      if (existingMember) {
        await prisma.teamMember.delete({
          where: { id: existingMember.id },
        });
      }
    }

    return res.status(200).json({
      message: "Application updated successfully.",
      updatedApplication,
    });
  } catch (error) {
    console.error("Error updating application:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
