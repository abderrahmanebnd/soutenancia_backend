const prisma = require("../prisma/prismaClient");
const genericController = require("./genericController");

exports.getAllTeachers = genericController.createListHandler("teacher", {
  include: {
    user: true,
    projectOffers: true  //optional you can remove it
  },
  defaultSort: { user: { firstName: "asc" } } //tri par default
});

exports.getTeacher = genericController.createGetOneHandler("teacher", {
  include: {
    user: true,
    projectOffers: true
  }
});
