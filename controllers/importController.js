const excelToJson = require("convert-excel-to-json");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const prisma = require("../prisma/prismaClient");
const { cleanupExcelFile } = require("../middlewares/multer");
const catchAsync = require("../utils/catchAsync");

// Import des étudiants depuis Excel
exports.importStudents = catchAsync(async (req, res) => {
  let filePath = null;

  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ 
        status: "fail",
        message: "Aucun fichier Excel trouvé" 
      });
    }

    filePath = req.file.path;
    
    const excelData = excelToJson({
      sourceFile: filePath,
      header: {
        rows: 1, // Ignorer la première ligne (en-têtes)
      },
      columnToKey: {
        A: "firstName",
        B: "lastName", 
        C: "email",
        D: "password",
        E: "enrollmentNumber",
        F: "specialityName",
        G: "year",
      },
    });

    const sheetName = Object.keys(excelData)[0];
    const studentsData = excelData[sheetName] || [];

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Le fichier Excel ne contient aucune donnée valide"
      });
    }

    // Traitement avec transaction pour garantir la cohérence
    const result = await prisma.$transaction(async (tx) => {
      let addedCount = 0;
      let existingCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const [index, studentData] of studentsData.entries()) {
        try {
          // Validation des champs requis
          if (!studentData.firstName || !studentData.lastName || !studentData.email || !studentData.password) {
            errors.push(`Ligne ${index + 2}: Champs requis manquants (firstName, lastName, email, password)`);
            errorCount++;
            continue;
          }

          // Vérifier si l'utilisateur existe déjà
          const existingUser = await tx.user.findUnique({
            where: { email: studentData.email },
          });

          if (existingUser) {
            existingCount++;
            continue;
          }

          
          if (studentData.enrollmentNumber) {
            const existingStudent = await tx.student.findUnique({
              where: { enrollmentNumber: studentData.enrollmentNumber },
            });

            if (existingStudent) {
              errors.push(`Ligne ${index + 2}: Numéro d'inscription ${studentData.enrollmentNumber} déjà utilisé`);
              errorCount++;
              continue;
            }
          }

          // Trouver la spécialite
          let specialityId = null;
          if (studentData.specialityName) {
            const speciality = await tx.speciality.findFirst({
              where: { 
                name: {
                  contains: studentData.specialityName,
                  mode: "insensitive"
                }
              },
            });

            if (!speciality) {
              errors.push(`Ligne ${index + 2}: Spécialité "${studentData.specialityName}" non trouvée`);
              errorCount++;
              continue;
            }
            specialityId = speciality.id;
          }

          // Créer l'utilisateur
          const newUser = await tx.user.create({
            data: {
              firstName: studentData.firstName.trim(),
              lastName: studentData.lastName.trim(),
              email: studentData.email.toLowerCase().trim(),
              password: await bcrypt.hash(studentData.password, 12),
              role: "student",
            },
          });

          // Créer le profil étudiant
          await tx.student.create({
            data: {
              userId: newUser.id,
              enrollmentNumber: studentData.enrollmentNumber?.trim() || null,
              specialityId: specialityId,
              customSkills: [],
            },
          });

          addedCount++;
        } catch (error) {
          console.error(`Erreur ligne ${index + 2}:`, error);
          errors.push(`Ligne ${index + 2}: ${error.message}`);
          errorCount++;
        }
      }

      return { addedCount, existingCount, errorCount, errors };
    });

    res.status(200).json({
      status: "success",
      message: `Import terminé: ${result.addedCount} étudiants ajoutés, ${result.existingCount} déjà existants, ${result.errorCount} erreurs`,
      data: {
        added: result.addedCount,
        existing: result.existingCount,
        errors: result.errorCount,
        errorDetails: result.errors,
      },
    });

  } catch (error) {
    console.error("Erreur lors de l'import des étudiants:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de l'import des étudiants",
      error: error.message,
    });
  } finally {
    if (filePath) {
      cleanupExcelFile(filePath);
    }
  }
});

exports.importTeachers = catchAsync(async (req, res) => {
  let filePath = null;

  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ 
        status: "fail",
        message: "Aucun fichier Excel trouvé" 
      });
    }

    filePath = req.file.path;
    
    const excelData = excelToJson({
      sourceFile: filePath,
      header: {
        rows: 1, 
      },
      columnToKey: {
        A: "firstName",
        B: "lastName",
        C: "email", 
        D: "password",
        E: "department",
        F: "title",
        G: "bio",
      },
    });

    const sheetName = Object.keys(excelData)[0];
    const teachersData = excelData[sheetName] || [];

    if (!Array.isArray(teachersData) || teachersData.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Le fichier Excel ne contient aucune donnée valide"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let addedCount = 0;
      let existingCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const [index, teacherData] of teachersData.entries()) {
        try {
          if (!teacherData.firstName || !teacherData.lastName || !teacherData.email || !teacherData.password) {
            errors.push(`Ligne ${index + 2}: Champs requis manquants (firstName, lastName, email, password)`);
            errorCount++;
            continue;
          }

          const existingUser = await tx.user.findUnique({
            where: { email: teacherData.email },
          });

          if (existingUser) {
            existingCount++;
            continue;
          }

          const newUser = await tx.user.create({
            data: {
              firstName: teacherData.firstName.trim(),
              lastName: teacherData.lastName.trim(),
              email: teacherData.email.toLowerCase().trim(),
              password: await bcrypt.hash(teacherData.password, 12),
              role: "teacher",
            },
          });

          await tx.teacher.create({
            data: {
              userId: newUser.id,
              department: teacherData.department?.trim() || null,
              title: teacherData.title?.trim() || null,
              bio: teacherData.bio?.trim() || null,
            },
          });

          addedCount++;
        } catch (error) {
          console.error(`Erreur ligne ${index + 2}:`, error);
          errors.push(`Ligne ${index + 2}: ${error.message}`);
          errorCount++;
        }
      }

      return { addedCount, existingCount, errorCount, errors };
    });

    res.status(200).json({
      status: "success",
      message: `Import terminé: ${result.addedCount} enseignants ajoutés, ${result.existingCount} déjà existants, ${result.errorCount} erreurs`,
      data: {
        added: result.addedCount,
        existing: result.existingCount,
        errors: result.errorCount,
        errorDetails: result.errors,
      },
    });

  } catch (error) {
    console.error("Erreur lors de l'import des enseignants:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de l'import des enseignants",
      error: error.message,
    });
  } finally {
    if (filePath) {
      cleanupExcelFile(filePath);
    }
  }
});