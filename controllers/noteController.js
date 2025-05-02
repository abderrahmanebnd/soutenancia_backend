const prisma = require("../prisma/prismaClient");

const checkSprintExists = async (sprintId) => {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint)
    res.status(404).json({ status: "fail", message: "Sprint not found" });
  return sprint;
};

const checkNoteExists = async (noteId) => {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note)
    res.status(404).json({ status: "fail", message: "Note not found" });
  return note;
};

exports.createNote = async (req, res) => {
  const { sprintId } = req.params;
  const { content } = req.body;
  const senderId = req.user.id;

  if (!content) {
    return res
      .status(400)
      .json({ status: "fail", message: "Content is required" });
  }

  await checkSprintExists(sprintId);

  const note = await prisma.note.create({
    data: {
      content,
      sprint: { connect: { id: sprintId } },
      sender: { connect: { id: senderId } },
    },
  });

  res.status(201).json({ status: "success", data: { note } });
};

exports.getNotesBySprint = async (req, res) => {
  const { sprintId } = req.params;
  await checkSprintExists(sprintId);

  const notes = await prisma.note.findMany({
    where: { sprintId },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    }, // include sender info
  });

  res.status(200).json({
    status: "success",
    results: notes.length,
    data: { notes },
  });
};

exports.deleteNote = async (req, res) => {
  const { noteId } = req.params;
  const senderId = req.user.id;

  const note = await checkNoteExists(noteId);

  // Only the sender can delete their own note
  if (note.senderId !== senderId) {
    return res
      .status(403)
      .json({ status: "fail", message: "You can delete only your own note" });
  }

  await prisma.note.delete({ where: { id: noteId } });

  res.status(204).json({ status: "success", data: null });
};
