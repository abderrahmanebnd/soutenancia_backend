const prisma = require("../prisma/prismaClient");

async function isProjectSelectionActiveForTeam(specialityId) {
  const now = new Date();

  const activeWindow = await prisma.projectSelectionWindow.findFirst({
    where: {
      startDate: { lte: now },
      endDate: { gte: now },
      specialityId,
    },
  });

  return !!activeWindow;
}

exports.isProjectSelectionActive = async (req, res, next) => {
  try {
    const teamOfferId = req.body.teamOfferId || req.params.teamOfferId;
    if (!teamOfferId) {
      return res.status(400).json({
        message: "teamOfferId is required .",
      });
    }
    const teamOffer = await prisma.teamOffer.findUnique({
      where: { id: teamOfferId },
      include: { speciality: true },
    });

    if (!teamOffer) {
      return res.status(404).json({
        message: "L'offre  do not exist.",
      });
    }

    if (!(await isProjectSelectionActiveForTeam(teamOffer.specialityId))) {
      return res.status(403).json({
        message: "the period is not active for this team",
      });
    }
    next();
  } catch (error) {
    console.log("Error in isProjectSelectionActive middleware:", error);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
};

exports.getProjectSelectionWindow = async (req, res) => {
  try {
    let windows = [];
    if (req.user.role === "admin" || req.user.role === "teacher") {
      windows = await prisma.projectSelectionWindow.findMany({
        orderBy: {
          startDate: "desc",
        },
      });
    } else if (req.user.Student) {
      const { specialityId } = req.user.Student;
      windows = await prisma.projectSelectionWindow.findMany({
        where: {
          specialityId,
        },
        orderBy: {
          startDate: "desc",
        },
      });
    }
    res.status(200).json({ status: "success", data: windows });
  } catch (error) {
    console.error("Error fetching project selection windows:", error);
    res.status(500).json({ error: "internal servor error" });
  }
};

exports.getProjectSelectionWindowById = async (req, res) => {
  try {
    const { id } = req.params;
    const window = await prisma.projectSelectionWindow.findUnique({
      where: { id },
    });
    if (!window) {
      return res.status(404).json({
        error: "Window not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: window,
    });
  } catch (error) {
    console.error("Error fetching project selection windows:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

exports.createProjectSelectionWindow = async (req, res) => {
  try {
    const { startDate, endDate, specialityId } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Les dates de début et de fin sont requises",
      });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        error: "endDate doit être après startDate",
      });
    }
    const newWindow = await prisma.projectSelectionWindow.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        specialityId,
      },
    });
    res.status(201).json({
      status: "success",
      data: newWindow,
    });
  } catch (error) {
    console.log("error creating project", error);
    res.status(500).json({
      message: "internal servor error",
    });
  }
};

exports.updateProjectSelectionWindow = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, specialityId } = req.body;

    // Vérifier si la fenêtre existe
    const existingWindow = await prisma.projectSelectionWindow.findUnique({
      where: { id },
    });

    if (!existingWindow) {
      return res.status(404).json({ error: "windows dont exist" });
    }

    // Préparation des données à mettre à jour
    const updateData = {};
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (specialityId !== undefined) updateData.specialityId = specialityId;

    // Validation des dates
    const newStartDate = updateData.startDate || existingWindow.startDate;
    const newEndDate = updateData.endDate || existingWindow.endDate;

    if (newEndDate <= newStartDate) {
      return res.status(400).json({
        error: "respect the end time and start time",
      });
    }

    // Mise à jour de la fenêtre
    const updatedWindow = await prisma.projectSelectionWindow.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ status: "success", data: updatedWindow });
  } catch (error) {
    console.error("Error updating project selection window:", error);
    res.status(500).json({ error: "internal server error" });
  }
};

exports.deleteProjectSelectionWindow = async (req, res) => {
  try {
    const { id } = req.params;

    const existingWindow = await prisma.projectSelectionWindow.findUnique({
      where: { id },
    });

    if (!existingWindow) {
      return res.status(404).json({ error: "window dont exist" });
    }

    await prisma.projectSelectionWindow.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting project selection window:", error);
    res.status(500).json({ error: "internal server error" });
  }
};
