const prisma = require("../prisma/prismaClient");

exports.getYearAssignmentTypes = async (req, res) => {
  try {
    const types = await prisma.yearAssignmentType.findMany();
    res.status(200).json({
      message: "success",
      data: types,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching year assignment types",
      error: err.message,
    });
  }
};

// Create
exports.createYearAssignmentType = async (req, res) => {
  try {
    const { year, assignmentType } = req.body;

    if (!year || !assignmentType) {
      return res.status(400).json({
        message: "Year and assignment type are required",
      });
    }

    if (
      (year && ![1, 2, 3, 4, 5].includes(year)) ||
      !["auto", "teacherApproval", "amiability"].includes(assignmentType)
    ) {
      return res.status(400).json({
        message:
          "Year must be between 1 and 5 and assignment type must be one of 'auto', 'teacherApproval', or 'amiability'",
      });
    }

    const existing = await prisma.yearAssignmentType.findUnique({
      where: { year },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Assignment type for this year already exists." });
    }

    const newType = await prisma.yearAssignmentType.create({
      data: { year, assignmentType },
    });

    res.status(201).json(newType);
  } catch (err) {
    res.status(500).json({
      message: "Error creating year assignment type",
      error: err.message,
    });
  }
};

exports.updateYearAssignmentType = async (req, res) => {
  const { id } = req.params;
  const { assignmentType } = req.body;

  try {
    const yearAssignment = await prisma.yearAssignmentType.findUnique({
      where: { id },
    });

    if (!yearAssignment) {
      return res.status(404).json({ message: "YearAssignmentType not found" });
    }

    if (!assignmentType) {
      return res.status(400).json({
        message: "Assignment type are required",
      });
    }

    if (!["auto", "teacherApproval", "amiability"].includes(assignmentType)) {
      return res.status(400).json({
        message:
          "Assignment type must be one of 'auto', 'teacherApproval', or 'amiability'",
      });
    }
    const updatedYearAssignment = await prisma.yearAssignmentType.update({
      where: { id },
      data: { assignmentType },
    });

    // Step 3: Update all ProjectOffers linked to Specialities with the same year
    const specialitiesWithSameYear = await prisma.speciality.findMany({
      where: { year: yearAssignment.year },
      select: { id: true },
    });

    const specialityIds = specialitiesWithSameYear.map((s) => s.id);

    await prisma.projectOffer.updateMany({
      where: {
        specialities: {
          some: {
            id: { in: specialityIds },
          },
        },
      },
      data: {
        assignmentType,
      },
    });

    res.status(200).json({
      message: "success",
      data: updatedYearAssignment,
    });
  } catch (error) {
    console.error("Error updating assignment type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete
exports.deleteYearAssignmentType = async (req, res) => {
  try {
    const { id } = req.params;

    const yearAssignmentType = await prisma.yearAssignmentType.findUnique({
      where: { id },
    });
    if (!yearAssignmentType) {
      return res.status(404).json({ message: "YearAssignmentType not found" });
    }
    await prisma.yearAssignmentType.delete({
      where: { id },
    });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting assignment type", error: err.message });
  }
};
