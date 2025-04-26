const prisma = require("../prisma/prismaClient");
const emailService = require("../services/emailService.js");

exports.getMyAssignedProject = async (req, res) => {
  try {
    const studentId = req.user.Student.id;

    const teamMembership = await prisma.teamMember.findFirst({
      where: { studentId },
      include: { teamOffer: true },
    });
    if (!teamMembership) {
      return res.status(404).json({
        status: "fail",
        message: "No team membership found for this student",
      });
    }
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: teamMembership.teamOfferId },
      include: {
        assignedProject: {
          include: {
            teacher: {
              include: { user: true },
            },
            specialities: true,
            coSupervisors: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!teamOffer || !teamOffer.assignedProjectId) {
      return res.status(404).json({
        status: "fail",
        message: "No assigned project found for this team",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        assignedProject: teamOffer.assignedProject,
      },
    });
  } catch (error) {
    console.error("Error fetching assigned project:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the assigned project",
    });
  }
};

exports.applyToProject = async (req, res) => {
  try {
    const { id: projectOfferId } = req.params;
    const { teamOfferId, message } = req.body;
    const studentId = req.user.Student.id;

    const projectOffer = await prisma.projectOffer.findUnique({
      where: { id: projectOfferId },
      include: {
        teacher: {
          include: { user: true },
        },
        _count: {
          select: {
            assignedTeams: true,
          },
        },
      },
    });
    if (!projectOffer) {
      return res.status(404).json({
        status: "fail",
        message: "Project offer not found",
      });
    }
    if (projectOffer.status !== "open") {
      return res.status(400).json({
        status: "fail",
        message: "Project offer is not open for applications",
      });
    }

    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: teamOfferId },
      include: {
        leader: {
          include: { user: true },
        },
      },
    });

    if (!teamOffer) {
      return res.status(404).json({
        status: "fail",
        message: "Team offer not found",
      });
    }

    if (teamOffer.leader_id !== studentId) {
      return res.status(403).json({
        status: "fail",
        message: "Only the team leader can apply to a project",
      });
    }

    if (teamOffer.assignedProjectId) {
      // Correction: utiliser assignedProjectId
      return res.status(400).json({
        status: "fail",
        message: "This team already has an assigned project",
      });
    }

    if (projectOffer.assignmentType === "auto") {
      // TODO: send email to the teacher
      await prisma.teamOffer.update({
        where: { id: teamOfferId },
        data: {
          assignedProjectId: projectOfferId,
        },
      });

      const assignedTeamsCount = projectOffer._count.assignedTeams;

      if (assignedTeamsCount + 1 >= projectOffer.maxTeamsNumber) {
        await prisma.projectOffer.update({
          where: { id: projectOfferId },
          data: { status: "closed" },
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Team has been auto-assigned to the project",
      });
    }

    if (projectOffer.assignmentType === "teacherApproval") {
      const existingApplication = await prisma.projectApplication.findFirst({
        where: {
          teamOfferId,
          projectOfferId,
        },
      });

      if (existingApplication) {
        if (existingApplication.status === "canceled") {
          const updatedApplication = await prisma.projectApplication.update({
            where: { id: existingApplication.id },
            data: {
              status: "pending",
              message: message || existingApplication.message, // new message if its exist
            },
          });

          await emailService
            .sendProjectApplicationNotification(
              projectOffer.teacher.user.email,
              projectOffer.teacher.user.firstName,
              projectOffer.title,
              teamOffer.leader.user.firstName +
                " " +
                teamOffer.leader.user.lastName,
              teamOffer.title
            )
            .catch((error) => console.error("Email error:", error));
          return res.status(200).json({
            status: "success",
            message: "Application reactivated successfully",
            data: {
              application: updatedApplication,
            },
          });
        } else {
          return res.status(400).json({
            status: "fail",
            message: "your team has already applied to this project",
          });
        }
      }

      if (projectOffer._count.assignedTeams >= projectOffer.maxTeamsNumber) {
        return res.status(400).json({
          status: "fail",
          message: "max of teams have been reached for this project",
        });
      }
      const application = await prisma.projectApplication.create({
        data: {
          projectOfferId,
          teamOfferId,
          message,
          status: "pending",
        },
      });

      await emailService
        .sendProjectApplicationNotification(
          projectOffer.teacher.user.email,
          projectOffer.teacher.user.firstName,
          projectOffer.title,
          teamOffer.leader.user.firstName +
            " " +
            teamOffer.leader.user.lastName,
          teamOffer.title
        )
        .catch((error) => console.error("Email error:", error));

      res.status(201).json({
        status: "success",
        data: {
          application,
        },
      });
    }
  } catch (error) {
    console.log("error applying to project", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while applying to the project",
    });
  }
};

exports.getProjectApplications = async (req, res) => {
  try {
    const { id: projectOfferId } = req.params;

    const projectOffer = await prisma.projectOffer.findUnique({
      where: { id: projectOfferId },
      include: { teacher: { include: { user: true } } },
    });

    if (!projectOffer) {
      return res.status(404).json({
        status: "fail",
        message: "Project offer not found",
      });
    }

    // Solution simple: vérifier si l'utilisateur est admin OU si c'est le professeur propriétaire
    if (
      req.user.role === "admin" ||
      (req.user.role === "teacher" &&
        projectOffer.teacher.user.id === req.user.id)
    ) {
      // Suite du code pour récupérer les candidatures
      const applications = await prisma.projectApplication.findMany({
        where: { projectOfferId },
        include: {
          teamOffer: {
            include: {
              leader: {
                include: { user: true },
              },
              TeamMembers: {
                include: {
                  student: {
                    include: { user: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({
        status: "success",
        results: applications.length,
        data: applications,
      });
    } else {
      return res.status(403).json({
        status: "fail",
        message: "You are not allowed to access applications for this project",
      });
    }
  } catch (error) {
    console.error("error fetching project applications", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the project applications",
    });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const studentId = req.user.Student.id;

    const teamMembership = await prisma.teamMember.findFirst({
      where: { studentId },
      select: { teamOfferId: true },
    });

    if (!teamMembership) {
      return res.status(200).json({
        status: "success",
        results: 0,
        data: [],
      });
    }

    const teamId = teamMembership.teamOfferId;

    const applications = await prisma.projectApplication.findMany({
      where: {
        teamOfferId: teamId,
      },
      include: {
        projectOffer: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
        teamOffer: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      results: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching my applications:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching your applications",
    });
  }
};

exports.acceptApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.projectApplication.findUnique({
      where: { id },
      include: {
        projectOffer: {
          include: {
            teacher: {
              include: { user: true },
            },
            _count: {
              select: {
                assignedTeams: true,
              },
            },
          },
        },
        teamOffer: {
          include: {
            leader: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "application not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      !(
        req.user.role === "teacher" &&
        application.projectOffer.teacher.user.id === req.user.id
      )
    ) {
      return res.status(403).json({
        status: "fail",
        message: "you are not allowed to accept or to reject this application",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        status: "fail",
        message: `this application is already ${application.status}`,
      });
    }

    const assignedTeamsCount = application.projectOffer._count.assignedTeams;

    if (assignedTeamsCount >= application.projectOffer.maxTeamsNumber) {
      return res.status(400).json({
        status: "fail",
        message: "max teams have been reached for this project",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Accepter cette candidature
      const updatedApplication = await tx.projectApplication.update({
        where: { id },
        data: { status: "accepted" },
      });

      // Assigner l'équipe au projet
      await tx.teamOffer.update({
        where: { id: application.teamOfferId },
        data: {
          assignedProjectId: application.projectOfferId,
        },
      });

      // Rejeter toutes les autres candidatures de cette équipe
      await tx.projectApplication.updateMany({
        where: {
          teamOfferId: application.teamOfferId,
          id: { not: id },
          status: "pending",
        },
        data: { status: "rejected" },
      });

      // Si le projet a atteint le nombre max d'équipes, le fermer
      if (assignedTeamsCount + 1 >= application.projectOffer.maxTeamsNumber) {
        await tx.projectOffer.update({
          where: { id: application.projectOfferId },
          data: { status: "closed" },
        });
      }

      return updatedApplication;
    });

    // 6. Envoyer un email de notification à l'équipe
    await emailService
      .sendProjectApplicationAccepted(
        application.teamOffer.leader.user.email,
        application.teamOffer.leader.user.firstName,
        application.projectOffer.title
      )
      .catch((error) => console.error("Email error:", error));

    res.status(200).json({
      status: "success",
      message: "application accepted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error accepting application:", error);
    res.status(500).json({
      status: "error",
      message: "an error occurred while accepting the application",
    });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.projectApplication.findUnique({
      where: { id },
      include: {
        projectOffer: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
        teamOffer: {
          include: {
            leader: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "application not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      !(
        req.user.role === "teacher" &&
        application.projectOffer.teacher.user.id === req.user.id
      )
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You are not allowed to accept or reject this application",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        status: "fail",
        message: `This application is already ${application.status}`,
      });
    }
    const updatedApplication = await prisma.projectApplication.update({
      where: { id },
      data: { status: "rejected" },
    });

    // 5. Envoyer un email de notification
    await emailService
      .sendProjectApplicationRejected(
        application.teamOffer.leader.user.email,
        application.teamOffer.leader.user.firstName,
        application.projectOffer.title
      )
      .catch((error) => console.error("Email error:", error));

    res.status(200).json({
      status: "success",
      message: "Candidature rejetée avec succès",
      data: updatedApplication,
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json({
      status: "error",
      message: "Une erreur est survenue lors du rejet de la candidature",
    });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.Student.id;

    const application = await prisma.projectApplication.findUnique({
      where: { id },
      include: { teamOffer: true },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "application not found",
      });
    }

    if (application.teamOffer.leader_id !== studentId) {
      return res.status(403).json({
        status: "fail",
        message: "only the team leader can cancel the application",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        status: "fail",
        message: `this application is already ${application.status} you cant cancel it`,
      });
    }

    const updatedApplication = await prisma.projectApplication.update({
      where: { id },
      data: { status: "canceled" },
    });

    res.status(200).json({
      status: "success",
      message: "applciation canceled successfully",
      data: updatedApplication,
    });
  } catch (error) {
    console.error("Error canceling application:", error);
    res.status(500).json({
      status: "error",
      message: "an error occurred while canceling the application",
    });
  }
};
