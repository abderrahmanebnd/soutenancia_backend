const { application } = require("express");
const prisma = require("../prisma/prismaClient");
const { validationResult } = require("express-validator");
const emailService = require("../services/emailService.js");
exports.applyToOffer = async (req, res) => {
  try {
    const { teamOfferId } = req.params;

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
    const { teamOfferId } = req.params;
    const userId = req.user.Student.id;

    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: teamOfferId },
      include: {
        TeamApplication: true,
      }, //include is like a join in sql
    });
    if (!teamOffer) {
      return res.status(404).json({ error: "Team offer not found" });
    }

    //verify if the user is the leader or a simple member

    const isLeader = teamOffer.leader_id === userId;
    const isMember = await prisma.teamMember.findFirst({
      where: { teamOfferId: teamOffer.id, studentId: userId },
    });

    if (!isLeader && !isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this team." });
    }
    return res.status(200).json({ applications: teamOffer.TeamApplication });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ error: "server error" });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    // hadi dertha bach nverifiw kbel matwsl db w n9edro negL3ouha ida front ygereha pcq , leader mykdrch ydirha pending wela cancelled

    if (status !== "accepted" && status !== "rejected") {
      return res.status(400).json({ error: "Invalid status" });
    }

    const application = await prisma.teamApplication.findUnique({
      where: { id: applicationId },
      include: { student: true, teamOffer: { include: { teamMembers: true } } },
    });
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (application.teamOffer.leader_id !== req.user.Student.id) {
      return res.status(403).json({ error: "You are not the leader" });
    }

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
        application.teamOffer.teamMembers.length >=
          application.teamOffer.max_members
      ) {
        return res.status(400).json({ error: "Team is full" });
      }
    }
    const updatedApplication = await prisma.teamApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        student: {
          include: {
            user: true
          }
        },
        teamOffer: true
      }
    });
    if (status === "accepted " || status === "rejected") {
      await emailService
        .sendEmailApplication(status, updatedApplication)
        .catch((error) => console.log("Email error", error));
    }
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

    return res.status(200).json({
      message: "Application updated successfully.",
      updatedApplication,
    });
  } catch (error) {
    console.error("Error updating application:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
