const prisma = require("../prisma/prismaClient");
const AppError = require("../utils/appError");

const checkSprintExists = async (sprintId) => {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) throw new AppError("Sprint not found", 404);
  return sprint;
};

const checkDeliverableExists = async (deliverableId) => {
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
  });
  if (!deliverable) throw new AppError("Deliverable not found", 404);
  return deliverable;
};

exports.createDeliverable = async (req, res) => {
  const { sprintId } = req.params;
  const { title, description, fileUrl, cloudinaryPublicId, studentId } =
    req.body;

  if (!title || !studentId) {
    return res.status(400).json({
      status: "fail",
      message: "Title and studentId are required",
    });
  }

  await checkSprintExists(sprintId);

  // Check student exists (optional but recommended)
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new AppError("Student not found", 404);

  const deliverable = await prisma.deliverable.create({
    data: {
      title,
      description,
      fileUrl,
      cloudinaryPublicId,
      sprint: { connect: { id: sprintId } },
      student: { connect: { id: studentId } },
    },
  });

  res.status(201).json({
    status: "success",
    data: { deliverable },
  });
};

exports.deleteDeliverable = async (req, res) => {
  const { deliverableId } = req.params;

  await checkDeliverableExists(deliverableId);

  await prisma.deliverable.delete({ where: { id: deliverableId } });

  res.status(204).json({ status: "success", data: null });
};
