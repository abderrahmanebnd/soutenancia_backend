const prisma = require("../prisma/prismaClient");

// Reusable: Check if project exists
const checkProjectExists = async (req, res, projectId) => {
  const project = await prisma.projectOffer.findUnique({
    where: { id: projectId },
  });
  if (!project)
    return res
      .status(404)
      .json({ status: "fail", message: "Project not found" });
  return project;
};

// Reusable: Check if sprint exists
const checkSprintExists = async (req, res, sprintId) => {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint)
    return res
      .status(404)
      .json({ status: "fail", message: "Sprint not found" });
  return sprint;
};

const checkTeamExists = async (req, res, teamId) => {
  const team = await prisma.teamOffer.findUnique({ where: { id: teamId } });
  if (!team)
    return res.status(404).json({ status: "fail", message: "Team not found" });
  return team;
};

exports.createSprint = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, startDate, endDate, status, teamId } = req.body;

  await checkProjectExists(req, res, projectId);
  await checkTeamExists(req, res, teamId);

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

  await checkProjectExists(req, res, projectId);

  const sprints = await prisma.sprint.findMany({
    where: { projectOfferId: projectId },
    orderBy: { startDate: "asc" },
    include: {
      team: true,
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

  const sprint = await checkSprintExists(req, res, sprintId);

  res.status(200).json({ status: "success", data: { sprint } });
};

exports.updateSprint = async (req, res) => {
  const { sprintId } = req.params;
  const data = req.body;

  await checkSprintExists(req, res, sprintId);

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data,
  });

  res.status(200).json({ status: "success", data: { sprint } });
};

exports.deleteSprint = async (req, res) => {
  const { sprintId } = req.params;

  await checkSprintExists(req, res, sprintId);

  await prisma.sprint.delete({ where: { id: sprintId } });

  res.status(204).json({ status: "success", data: null });
};
