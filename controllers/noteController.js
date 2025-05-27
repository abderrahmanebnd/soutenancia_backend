const prisma = require("../prisma/prismaClient");

const checkSprintExists = async (req, res, sprintId) => {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint)
    return res
      .status(404)
      .json({ status: "fail", message: "Sprint not found" });
  return sprint;
};

const checkNoteExists = async (req, res, noteId) => {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note)
    return res.status(404).json({ status: "fail", message: "Note not found" });
  return note;
};

exports.createNote = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    if (!content) {
      return res
        .status(400)
        .json({ status: "fail", message: "Content is required" });
    }

    await checkSprintExists(req, res, sprintId);

    const note = await prisma.note.create({
      data: {
        content,
        sprint: { connect: { id: sprintId } },
        sender: { connect: { id: senderId } },
      },
    });

    res.status(201).json({ status: "success", data: { note } });
  } catch (err) {
    console.error("Error in createNote:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

exports.getNotesBySprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    await checkSprintExists(req, res, sprintId);

    const notes = await prisma.note.findMany({
      where: { sprintId },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.status(200).json({
      status: "success",
      results: notes.length,
      data: { notes },
    });
  } catch (err) {
    console.error("Error in getNotesBySprint:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const senderId = req.user.id;

    const note = await checkNoteExists(req, res, noteId);

    // Only the sender can delete their own note
    if (note.senderId !== senderId) {
      return res
        .status(403)
        .json({ status: "fail", message: "You can delete only your own note" });
    }

    await prisma.note.delete({ where: { id: noteId } });

    res.status(204).json({ status: "success", data: null });
  } catch (err) {
    console.error("Error in deleteNote:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};
