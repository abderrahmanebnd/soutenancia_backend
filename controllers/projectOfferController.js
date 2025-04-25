const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createProjectOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      tools,
      languages,
      maxTeamsNumber,
      fileUrl,
      year,
      specialities,
      chosedTeamsIds,
      coSupervisors,
    } = req.body;

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
        message: `No assignment type configured for year ${selectedYear}.`,
      });
    }

    const data = {
      title,
      description,
      tools,
      languages,
      maxTeamsNumber,
      teacherId: teacher.id,
      assignmentType: yearAssignment.assignmentType,
      specialities: {
        connect: specialities.map((id) => ({ id })),
      },
      coSupervisors: {
        connect: coSupervisors?.map((id) => ({ id })),
      },
    };

    if (fileUrl) data.fileUrl = fileUrl;
    if (year) data.year = year;

    const projectOffer = await prisma.projectOffer.create({
      data,
      include: { specialities: true, coSupervisors: true },
    });

    res.status(201).json(projectOffer);
  } catch (err) {
    console.error(err);
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
        assignedTeams: true,
      },
    });

    res.status(200).json(offers);
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

    res.status(200).json(offer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching project offer." });
  }
};

exports.updateProjectOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

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
    }
    const updated = await prisma.projectOffer.update({
      where: { id },
      data,
      include: { specialities: true, coSupervisors: true, teacher: true },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update project offer." });
  }
};

exports.deleteProjectOffer = async (req, res) => {
  try {
    const { id } = req.params;

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
