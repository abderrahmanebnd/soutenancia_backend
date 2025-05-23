const { cleanupFile } = require("../middlewares/multer");
const prisma = require("../prisma/prismaClient");
const cloudinaryService = require("../services/cloudinary");
exports.getDeliverables = async (req, res) => {
  const { sprintId } = req.params;

  try {
    const deliverables = await prisma.deliverable.findMany({
      where: { sprintId },
      include: { sender: true },
    });

    res.status(200).json({ success: true, data: deliverables });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.addDeliverable = async (req, res) => {
  const { sprintId } = req.params;
  const data = req.body;
  const senderId = req.user.id;
  const file = req.file;

  console.log("File received:", req.file); // Log the file information

  try {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) {
      return res
        .status(404)
        .json({ success: false, message: "Sprint not found" });
    }

    let fileUrl = null;
    let cloudinaryPublicId = null;

    // If file uploaded, upload to Cloudinary
    if (file) {
      const uploadResult = await cloudinaryService.uploadFile(file.path, {
        folder: `deliverables/${senderId}/${sprintId}`,
      });
      if (uploadResult.success) {
        fileUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
        cleanupFile(file.path); // Cleanup the file after upload
      } else {
        cleanupFile(file.path); // Cleanup the file even if upload fails
        return res.status(500).json({
          success: false,
          message: "File upload failed",
        });
      }
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        ...data,
        sprint: { connect: { id: sprintId } },
        sender: { connect: { id: senderId } },
        fileUrl,
        cloudinaryPublicId,
      },
    });

    res.status(201).json({ success: true, data: deliverable });
  } catch (error) {
    // console.error("Error adding deliverable:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// REMOVE deliverable
exports.deleteDeliverable = async (req, res) => {
  const { sprintId, deliverableId } = req.params;

  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
    });

    if (!deliverable || deliverable.sprintId !== sprintId) {
      return res.status(404).json({
        success: false,
        message: "Deliverable not found in this sprint",
      });
    }

    // Delete file from Cloudinary if exists
    if (deliverable?.cloudinaryPublicId) {
      await cloudinaryService.deleteFile(deliverable.cloudinaryPublicId);
    }

    await prisma.deliverable.delete({ where: { id: deliverableId } });

    res
      .status(200)
      .json({ success: true, message: "Deliverable deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
