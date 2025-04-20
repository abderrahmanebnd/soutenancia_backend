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
      assignmentType,
      specialities,
    } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    const projectOffer = await prisma.projectOffer.create({
      data: {
        title,
        description,
        tools,
        languages,
        maxTeamsNumber,
        fileUrl,
        assignmentType,
        teacherId: teacher.id,
        specialities: {
          connect: specialities?.map((id) => ({ id })),
        },
      },
      include: { specialities: true },
    });

    res.status(201).json(projectOffer);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong creating the project offer." });
  }
};

exports.getAllProjectOffers = async (req, res) => {
  try {
    const offers = await prisma.projectOffer.findMany({
      include: {
        teacher: true,
        specialities: true,
        applications: true,
        assignedTeam: true,
      },
    });

    res.status(200).json(offers);
  } catch (err) {
    console.error(err);
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
      include: { specialities: true, applications: true },
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
      include: { specialities: true, applications: true, teacher: true },
    });

    if (!offer)
      return res.status(404).json({ message: "Project offer not found" });

    res.status(200).json(offer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching project offer." });
  }
};

// PATCH /api/v1/project-offers/:id
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

    const updated = await prisma.projectOffer.update({
      where: { id },
      data,
      include: { specialities: true },
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

    res.status(204).json({ message: "Project offer deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete project offer." });
  }
};

exports.getProjectOfferHistory = async (req, res) => {
  try {
    const offers = await prisma.projectOffer.findMany({
      where: {
        status: "closed",
        year: {
          lte: new Date().getFullYear(),
        },
      },
      include: {
        specialities: true,
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
