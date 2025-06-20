const prisma = require("../prisma/prismaClient");

async function isTeamCompositionActiveForStudent(specialityId) {
  const now = new Date();

  const activeWindow = await prisma.teamCompositionWindow.findFirst({
    where: {
      startDate: { lte: now }, // this means the start date is in the past or now
      endDate: { gte: now }, // this means the end date is in the future or now
      specialityId,
    },
  });

  return !!activeWindow;
}

exports.isTeamCompositionActive = async (req, res, next) => {
  const student = req.user.Student;

  if (!(await isTeamCompositionActiveForStudent(student.specialityId))) {
    return res.status(403).json({
      message:
        "Team composition activities are currently closed for your speciality/year.",
    });
  }

  next();
};

// GET all settings (admin gets all, student gets filtered)
exports.getTeamCompositionSettings = async (req, res) => {
  try {
    let data;

    if (req.user.role === "admin") {
      data = await prisma.teamCompositionWindow.findMany();
    } else if (req.user.Student) {
      const { specialityId } = req.user.Student;

      data = await prisma.teamCompositionWindow.findMany({
        where: {
          specialityId,
        },
      });
    }

    res.status(200).json({ status: "success", data });
  } catch (error) {
    console.error("Error fetching team composition settings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET setting by ID
exports.getTeamCompositionSettingsById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.teamCompositionWindow.findUnique({
      where: { id },
    });

    if (!data) {
      return res.status(404).json({ error: "Setting not found" });
    }

    res.status(200).json({ status: "success", data });
  } catch (error) {
    console.error("Error fetching setting by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// CREATE new setting
exports.createTeamCompositionSettings = async (req, res) => {
  const { startDate, endDate, specialityId } = req.body;

  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({ error: "endDate must be after startDate" });
  }

  try {
    const created = await prisma.teamCompositionWindow.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        specialityId,
      },
    });

    res.status(201).json({ status: "success", data: created });
  } catch (error) {
    console.error("Error creating setting:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// UPDATE setting
exports.updateTeamCompositionSettings = async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, specialityId } = req.body;

  try {
    const existing = await prisma.teamCompositionWindow.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Setting not found" });
    }

    const updatedStart = startDate ? new Date(startDate) : existing.startDate;
    const updatedEnd = endDate ? new Date(endDate) : existing.endDate;

    if (updatedEnd <= updatedStart) {
      return res.status(400).json({ error: "endDate must be after startDate" });
    }

    const updateData = {};
    if (startDate !== undefined) updateData.startDate = updatedStart;
    if (endDate !== undefined) updateData.endDate = updatedEnd;
    if (specialityId !== undefined) updateData.specialityId = specialityId;

    const updated = await prisma.teamCompositionWindow.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// DELETE setting
exports.deleteTeamCompositionSettings = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.teamCompositionWindow.delete({ where: { id } });

    res.status(204).json({ status: "success", message: "Setting deleted" });
  } catch (error) {
    console.error("Error deleting setting:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
