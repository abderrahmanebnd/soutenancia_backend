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
      specialities: specialitiesInput,
      coSupervisors: coSupervisorsInput,
    } = req.body;

    // parsing json data
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

    const data = {
      title,
      description,
      tools,
      languages,
      maxTeamsNumber: parseInt(maxTeamsNumber, 10),
      fileUrl,
      cloudinaryPublicId,
      year: selectedYear,
      teacherId: teacher.id,
      assignmentType: yearAssignment.assignmentType,
      specialities: {
        connect: specialities.map((id) => ({ id })),
      },
      coSupervisors: {
        connect: coSupervisors?.map((id) => ({ id })),
      },
    };

    const projectOffer = await prisma.projectOffer.create({
      data,
      include: { specialities: true, coSupervisors: true },
    });

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
    // TODO: return just the offers for the current user depending on his speciality
    // TODO: use the speciality table in the student also and so on
    const offers = await prisma.projectOffer.findMany({
      where: {
        status: "open",
        year: {
          gte: new Date().getFullYear(), // Only show offers for the current year and future years
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

    res.status(200).json({
      status: "success",
      results: offers.length,
      data: offers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "fail",
      message: "Error fetching project offers.",
    });
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
        assignedTeams: true,
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
    const data = { ...req.body };

    const existingOffer = await prisma.projectOffer.findUnique({
      where: { id },
      select: { cloudinaryPublicId: true, teacherId: true },
    });
    if (!existingOffer) {
      if (req.file) cleanupFile(req.file.path);
      return res.status(404).json({
        status: "fail",
        message: "Project offer not found",
      });
    }
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (req.user.role !== "admin" && existingOffer.teacherId !== teacher?.id) {
      if (req.file) cleanupFile(req.file.path);
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission to update this offer",
      });
    }

    if (req.file) {
      //delete the previos file if a new is upladed
      if (existingOffer?.cloudinaryPublicId) {
        await cloudinaryService.deleteFile(existingOffer.cloudinaryPublicId);
      }

      const uploadResult = await cloudinaryService.uploadFile(req.file.path, {
        folder: `project_offers/${req.user.Teacher?.id || "unknown"}`,
      });

      if (uploadResult.success) {
        data.fileUrl = uploadResult.url;
        data.cloudinaryPublicId = uploadResult.publicId;
        cleanupFile(req.file.path);
      } else {
        cleanupFile(req.file.path);
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload file to cloud storage",
        });
      }
    }
    if (data.tools && typeof data.tools === "string") {
      data.tools = JSON.parse(data.tools);
    }

    if (data.languages && typeof data.languages === "string") {
      data.languages = JSON.parse(data.languages);
    }

    if (data.specialities) {
      data.specialities = {
        set: [],
        connect: data.specialities.map((id) => ({ id })),
      };
    }

    if (data.coSupervisors) {
      data.coSupervisors = {
        set: [],
        connect: data.coSupervisors.map((id) => ({ id })),
      };
    }

    if (data.assignmentType) {
      data.assignmentType = undefined;
      res.status(400).json({
        message: "Assignment type cannot be updated.",
      });
      return;
    }
    const updated = await prisma.projectOffer.update({
      where: { id },
      data,
      include: { specialities: true, coSupervisors: true, teacher: true },
    });

    res.status(200).json({
      status: "success",
      data: updated,
    });
  } catch (err) {
    if (req.file) {
      cleanupFile(req.file.path);
    }
    console.error(err);
    res.status(500).json({ message: "Could not update project offer." });
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
