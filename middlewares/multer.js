// multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

const uploadDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.error("Erreur lors de la création du dossier uploads:", error);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Seuls les fichiers PDF, DOC, DOCX, PPT, PPTX, JPG et PNG sont acceptés.",
        400
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

exports.uploadSingle = upload.single("file");

exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "fail",
        message: "La taille du fichier ne doit pas dépasser 10MB",
      });
    }
    return res.status(400).json({
      status: "fail",
      message: `Erreur d'upload: ${err.message}`,
    });
  }

  if (err) {
    return res.status(err.statusCode || 400).json({
      status: "fail",
      message: err.message,
    });
  }

  next();
};

exports.cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error cleaning up file:", error);
  }
};

// Middleware to clean up the file if an error occurs after upload
exports.cleanupOnError = (req, res, next) => {
  // Stocker la fonction originale res.json
  const originalJson = res.json;

  // Remplacer res.json par notre propre implémentation
  res.json = function (body) {
    // Si la réponse est une erreur (status >= 400) et qu'un fichier existe
    if (res.statusCode >= 400 && req.file) {
      exports.cleanupFile(req.file.path);
    }

    // Appeler la fonction originale
    return originalJson.call(this, body);
  };

  next();
};
