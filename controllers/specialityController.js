const prisma = require("../prisma/prismaClient");

exports.getAllSpecialities = async (req, res) => {
  try {
    const specialities = await prisma.speciality.findMany();

    res.status(200).json({
      status: "success",
      results: specialities.length,
      data: specialities,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.createSpeciality = async (req, res) => {
  try {
    const { name, year } = req.body;

    const parsedYear = parseInt(year, 10);

    if (
      year &&
      (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 5)
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Year must be an integer between 1 and 5",
      });
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        status: "fail",
        message: "Speciality name is required",
      });
    }

    const newSpeciality = await prisma.speciality.create({
      data: {
        name,
        year: parsedYear,
      },
    });

    res.status(201).json({
      status: "success",
      data: newSpeciality,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getSpecialityById = async (req, res) => {
  try {
    const { id } = req.params;

    const speciality = await prisma.speciality.findUnique({
      where: { id },
    });

    if (!speciality) {
      return res
        .status(404)
        .json({ status: "fail", message: "Speciality not found" });
    }

    res.status(200).json({
      status: "success",
      data: speciality,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.updateSpeciality = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;

    const { year } = data;

    if (year !== undefined) {
      const parsedYear = parseInt(year, 10);

      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 5) {
        return res.status(400).json({
          status: "fail",
          message: "Year must be an integer between 1 and 5",
        });
      }

      data = { ...data, year: parsedYear }; // replace string year with number
    }

    const updatedSpeciality = await prisma.speciality.update({
      where: { id },
      data,
    });

    res.status(200).json({
      status: "success",
      data: updatedSpeciality,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.deleteSpeciality = async (req, res) => {
  const { id } = req.params;

  await prisma.speciality.delete({
    where: { id },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
};
