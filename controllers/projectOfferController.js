const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinaryService = require("../services/cloudinary");
const { cleanupFile } = require("../middlewares/multer");

exports.createProjectOffer = async (req, res) => {
  try {
    let {
      title,
      description,
      tools: toolsInput,
      languages: languagesInput,
      maxTeamsNumber,
      year,
      specialities: specialitiesInput,
      chosedTeamsIds,
      coSupervisors: coSupervisorsInput,
    } = req.body;

    // parsing json data
    year = Number(year);
    const tools =
      typeof toolsInput === "string" ? JSON.parse(toolsInput) : toolsInput;
    const languages =
      typeof languagesInput === "string"
        ? JSON.parse(languagesInput)
        : languagesInput;
    const specialities =
      typeof specialitiesInput === "string"
        ? JSON.parse(specialitiesInput)
        : specialitiesInput;
    const coSupervisors =
      coSupervisorsInput &&
      (typeof coSupervisorsInput === "string"
        ? JSON.parse(coSupervisorsInput)
        : coSupervisorsInput);
    chosedTeamsIds =
      typeof chosedTeamsIds === "string"
        ? JSON.parse(chosedTeamsIds)
        : chosedTeamsIds;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      return res.status(404).json({
        status: "fail",
        message: "Teacher not found for this user.",
      });
    }
    const specialitiesData = await prisma.speciality.findMany({
      where: {
        id: { in: specialities },
      },
    });

    if (specialitiesData.length === 0) {
      if (req.file) cleanupFile(req.file.path);
      return res.status(400).json({
        status: "fail",
        message:
          "Aucune spécialité trouvée avec les identifiants fournis. Veuillez vérifier les IDs de spécialité.",
      });
    }

    const years = [...new Set(specialitiesData.map((s) => s.year))];

    if (years.length > 1) {
      return res.status(400).json({
        status: "fail",
        message: "All selected specialities must belong to the same year.",
      });
    }

    const selectedYear = years[0];

    if (chosedTeamsIds?.length > 0) {
      const chosenTeams = await prisma.teamOffer.findMany({
        where: {
          id: { in: chosedTeamsIds },
        },
        select: {
          id: true,
          specialityId: true,
        },
      });

      const selectedSpecialityIds = new Set(specialities);

      const allTeamsValid = chosenTeams.every((team) =>
        selectedSpecialityIds.has(team.specialityId)
      );

      if (!allTeamsValid) {
        return res.status(400).json({
          status: "fail",
          message:
            "All selected teams must have a speciality that matches one of the project offer's specialities.",
        });
      }
    }

    const yearAssignment = await prisma.yearAssignmentType.findUnique({
      where: { year: selectedYear },
    });

    if (!yearAssignment) {
      return res.status(400).json({
        status: "fail",
        message: `No assignment type for year ${selectedYear}`,
      });
    }

    let fileUrl = null;
    let cloudinaryPublicId = null;

    if (req.file) {
      const uploadResult = await cloudinaryService.uploadFile(req.file.path, {
        folder: `project_offers/${teacher.id}`,
      });
      if (uploadResult.success) {
        fileUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;

        cleanupFile(req.file.path); // Clean up the local file after upload
      } else {
        cleanupFile(req.file.path);
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload file to cloud storage",
        });
      }
    }
    const assignmentType = yearAssignment?.assignmentType || "teacherApproval";

    const data = {
      title,
      description,
      tools,
      languages,
      maxTeamsNumber: parseInt(maxTeamsNumber, 10),
      fileUrl,
      cloudinaryPublicId,
      year: Number(year),
      teacherId: teacher.id,
      assignmentType,
      specialities: {
        connect: specialities.map((id) => ({ id })),
      },
      coSupervisors: {
        connect: coSupervisors?.map((id) => ({ id })),
      },
    };

    if (
      yearAssignment.assignmentType === "amiability" &&
      chosedTeamsIds?.length === maxTeamsNumber
    ) {
      data.status = "closed";
    }
    const projectOffer = await prisma.projectOffer.create({
      data,
      include: { specialities: true, coSupervisors: true },
    });

    if (
      yearAssignment.assignmentType === "amiability" &&
      chosedTeamsIds?.length
    ) {
      await Promise.all(
        chosedTeamsIds.map((teamId) =>
          prisma.teamOffer.update({
            where: { id: teamId },
            data: {
              assignedProject: { connect: { id: projectOffer.id } },
            },
          })
        )
      );
    }

    res.status(201).json({
      status: "success",
      data: projectOffer,
    });
  } catch (err) {
    if (req.file) {
      cleanupFile(req.file.path);
    }
    console.error("Project offer creation error", err);
    res.status(500).json({
      message: "Something went wrong creating the project offer.",
      error: err.message,
    });
  }
};

exports.getAllProjectOffers = async (req, res) => {
  try {
    let offers = [];
    if (req.user.role === "student") {
      const studentSpecialityId = req.user.Student.specialityId;

      offers = await prisma.projectOffer.findMany({
        where: {
          status: "open",
          year: {
            gte: new Date().getFullYear(),
          },
          specialities: {
            some: {
              id: studentSpecialityId,
            },
          },
        },
        include: {
          teacher: true,
          specialities: true,
          applications: true,
          _count: {
            select: {
              assignedTeams: true,
            },
          },
        },
      });
    } else {
      offers = await prisma.projectOffer.findMany({
        where: {
          status: "open",
          year: {
            gte: new Date().getFullYear(),
          },
        },
        include: {
          teacher: true,
          specialities: true,
          applications: true,
          _count: {
            select: {
              assignedTeams: true,
            },
          },
        },
      });
    }
    res.status(200).json({
      status: "success",
      results: offers.length,
      data: offers,
    });
  } catch (err) {
    console.error("Error fetching project offers:", err);
    res.status(500).json({ message: "Error fetching project offers." });
  }
};

exports.getMyProjectOffer = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    const offers = await prisma.projectOffer.findMany({
      where: { teacherId: teacher.id },
      include: {
        specialities: true,
        applications: true,
        teacher: {
          include: {
            user: true,
          },
        },
        coSupervisors: {
          include: {
            user: true,
          },
        },
        assignedTeams: true, // this will include the assigned teams
      },
    });

    res.status(200).json({
      status: "success",
      results: offers.length,
      data: offers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch your project offers." });
  }
};

exports.getProjectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await prisma.projectOffer.findUnique({
      where: { id },
      include: {
        specialities: true,
        applications: true,
        teacher: {
          include: {
            user: true,
          },
        },
        coSupervisors: {
          include: {
            user: true,
          },
        },
        assignedTeams: true,
      },
    });

    if (!offer)
      return res.status(404).json({ message: "Project offer not found" });

    res.status(200).json({
      status: "success",
      data: offer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching project offer." });
  }
};

exports.updateProjectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      title,
      description,
      tools: toolsInput,
      languages: languagesInput,
      maxTeamsNumber,
      specialities: specialitiesInput,
      chosedTeamsIds: chosedTeamsIdsInput,
      coSupervisors: coSupervisorsInput,
    } = req.body;

    const tools =
      toolsInput && typeof toolsInput === "string"
        ? JSON.parse(toolsInput)
        : toolsInput;
    const languages =
      languagesInput && typeof languagesInput === "string"
        ? JSON.parse(languagesInput)
        : languagesInput;
    const specialities =
      specialitiesInput && typeof specialitiesInput === "string"
        ? JSON.parse(specialitiesInput)
        : specialitiesInput;
    const coSupervisors =
      coSupervisorsInput && typeof coSupervisorsInput === "string"
        ? JSON.parse(coSupervisorsInput)
        : coSupervisorsInput;
    const chosedTeamsIds =
      chosedTeamsIdsInput && typeof chosedTeamsIdsInput === "string"
        ? JSON.parse(chosedTeamsIdsInput)
        : chosedTeamsIdsInput;

    // i need to fetch the teacher for the cloudinary file
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      if (req.file) cleanupFile(req.file.path);
      return res.status(404).json({
        status: "fail",
        message: "Teacher not found for this user.",
      });
    }
    const existingProject = await prisma.projectOffer.findUnique({
      where: { id },
      include: { teacher: true, assignedTeams: true, specialities: true },
    });

    if (!existingProject) {
      return res.status(404).json({
        status: "fail",
        message: "Project offer not found.",
      });
    }

    if (req.body.assignmentType) {
      return res.status(400).json({
        message: "Assignment type cannot be updated.",
      });
    }

    let assignmentType = existingProject.assignmentType;
    let fileUrl = existingProject.fileUrl;
    let cloudinaryPublicId = existingProject.cloudinaryPublicId;

    if (req.file) {
      // Supprimer l'ancien fichier si existant
      if (cloudinaryPublicId) {
        await cloudinaryService.deleteFile(cloudinaryPublicId);
      }

      const uploadResult = await cloudinaryService.uploadFile(req.file.path, {
        folder: `project_offers/${teacher.id}`,
      });

      if (uploadResult.success) {
        fileUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
        cleanupFile(req.file.path);
      } else {
        cleanupFile(req.file.path);
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload file to cloud storage",
        });
      }
    }
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tools !== undefined) updateData.tools = tools;
    if (languages !== undefined) updateData.languages = languages;
    if (maxTeamsNumber !== undefined)
      updateData.maxTeamsNumber = parseInt(maxTeamsNumber, 10);
    if (fileUrl !== existingProject.fileUrl) {
      updateData.fileUrl = fileUrl;
      updateData.cloudinaryPublicId = cloudinaryPublicId;
    }

    if (specialities !== undefined) {
      const specialitiesData = await prisma.speciality.findMany({
        where: { id: { in: specialities } },
      });

      const years = [...new Set(specialitiesData.map((s) => s.year))];

      if (years.length > 1) {
        if (req.file) cleanupFile(req.file.path);
        return res.status(400).json({
          status: "fail",
          message: "All selected specialities must belong to the same year.",
        });
      }

      updateData.specialities = {
        set: [],
        connect: specialities.map((id) => ({ id })),
      };

      const selectedYear = years[0];
      const yearAssignment = await prisma.yearAssignmentType.findUnique({
        where: { year: selectedYear },
      });

      assignmentType = yearAssignment?.assignmentType || "teacherApproval";
    }

    if (coSupervisors !== undefined) {
      updateData.coSupervisors = {
        set: [],
        connect: coSupervisors.map((id) => ({ id })),
      };
    }

    if (assignmentType === "amiability" && chosedTeamsIds?.length > 0) {
      const chosenTeams = await prisma.teamOffer.findMany({
        where: { id: { in: chosedTeamsIds } },
        select: { id: true, specialityId: true },
      });

      const selectedSpecialityIds =
        specialities !== undefined
          ? new Set(specialities)
          : new Set(existingProject.specialities.map((s) => s.id));

      const allTeamsValid = chosenTeams.every((team) =>
        selectedSpecialityIds.has(team.specialityId)
      );

      if (!allTeamsValid) {
        return res.status(400).json({
          status: "fail",
          message: "All selected teams must have a matching speciality.",
        });
      }

      if (
        maxTeamsNumber !== undefined &&
        chosedTeamsIds.length === maxTeamsNumber
      ) {
        updateData.status = "closed";
      } else {
        updateData.status = "open";
      }
    }

    const updatedProject = await prisma.projectOffer.update({
      where: { id },
      data: updateData,
      include: { specialities: true, coSupervisors: true, teacher: true },
    });

    if (assignmentType === "amiability" && chosedTeamsIds?.length > 0) {
      await prisma.teamOffer.updateMany({
        where: { projectOfferId: updatedProject.id },
        data: { projectOfferId: null },
      });

      await Promise.all(
        chosedTeamsIds.map((teamId) =>
          prisma.teamOffer.update({
            where: { id: teamId },
            data: { assignedProject: { connect: { id: updatedProject.id } } },
          })
        )
      );
    }

    res.status(200).json({
      status: "success",
      data: updatedProject,
    });
  } catch (err) {
    if (req.file) {
      cleanupFile(req.file.path);
    }
    console.error(err);
    res.status(500).json({
      message: "Could not update project offer.",
      error: err.message,
    });
  }
};

exports.deleteProjectOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const projectOffer = await prisma.projectOffer.findUnique({
      where: { id },
      select: { cloudinaryPublicId: true, teacherId: true },
    });
    if (!projectOffer) {
      return res.status(404).json({
        status: "fail",
        message: "Project offer not found",
      });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (req.user.role !== "admin" && projectOffer.teacherId !== teacher?.id) {
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission to delete this offer",
      });
    }

    if (projectOffer?.cloudinaryPublicId) {
      await cloudinaryService.deleteFile(projectOffer.cloudinaryPublicId);
    }

    await prisma.projectOffer.delete({ where: { id } });

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete project offer." });
  }
};

exports.getProjectOfferHistory = async (req, res) => {
  try {
    const offers = await prisma.projectOffer.findMany({
      where: {
        // status: "closed",
        year: {
          lt: new Date().getFullYear(),
        },
      },
      include: {
        specialities: true,
        _count: {
          select: {
            assignedTeams: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      status: "success",
      results: offers.length,
      data: { offers },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
