const prisma = require("../prisma/prismaClient");

// Reusable: Check if project exists
const checkProjectExists = async (projectId) => {
  const project = await prisma.projectOffer.findUnique({
    where: { id: projectId },
  });
  if (!project) throw AppError("Project not found", 404);
  return project;
};

// Reusable: Check if sprint exists
const checkSprintExists = async (sprintId) => {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) throw AppError("Sprint not found", 404);
  return sprint;
};

const checkTeamExists = async (teamId) => {
  const team = await prisma.teamOffer.findUnique({ where: { id: teamId } });
  if (!team) throw AppError("Team not found", 404);
  return team;
};

exports.createSprint = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, startDate, endDate, status, teamId } = req.body;

  await checkProjectExists(projectId);
  await checkTeamExists(teamId);

  const sprint = await prisma.sprint.create({
    data: {
      title,
      description,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      project: { connect: { id: projectId } },
      team: { connect: { id: teamId } },
    },
  });

  res.status(201).json({ status: "success", data: { sprint } });
};

exports.getSprintsByProject = async (req, res) => {
  const { projectId } = req.params;

  await checkProjectExists(projectId);

  const sprints = await prisma.sprint.findMany({
    where: { projectOfferId: projectId },
    orderBy: { startDate: "asc" },
    include: {
      team: true,
      // project: true,
    },
  });

  res.status(200).json({
    status: "success",
    results: sprints.length,
    data: { sprints },
  });
};

exports.getSprint = async (req, res) => {
  const { sprintId } = req.params;

  const sprint = await checkSprintExists(sprintId);

  res.status(200).json({ status: "success", data: { sprint } });
};

exports.updateSprint = async (req, res) => {
  const { sprintId } = req.params;
  const data = req.body;

  await checkSprintExists(sprintId);

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data,
  });

  res.status(200).json({ status: "success", data: { sprint } });
};

exports.deleteSprint = async (req, res) => {
  const { sprintId } = req.params;

  await checkSprintExists(sprintId);

  await prisma.sprint.delete({ where: { id: sprintId } });

  res.status(204).json({ status: "success", data: null });
};
