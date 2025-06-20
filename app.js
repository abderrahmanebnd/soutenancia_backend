const express = require("express");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");
const path = require("path");
const authRouter = require("./routes/authRoutes");
const teamCompositionSettingsRouter = require("./routes/teamCompositionSettingsRoutes");
const userRouter = require("./routes/userRoutes");
const studentRouter = require("./routes/studentRoutes");
const teamOfferRouter = require("./routes/teamOfferRoutes");
const teamApplicationRouter = require("./routes/teamApplicationRoutes");
const projectSelectionWindowRoutes = require("./routes/ProjectSelectionWindowRoutes");
const projectApplicationRoutes = require("./routes/projectApplicationRoutes");
const skillRoutes = require("./routes/skillRoutes");
const importRoutes = require("./routes/importRoutes");

const app = express();

app.use("/public", express.static(path.join(__dirname, "public")));

app.use(
  cors({
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],

    origin: "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use(mongoSanitize());
app.use(xss());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/settings/teamComposition", teamCompositionSettingsRouter);
app.use("/api/v1/settings/projectSelection", projectSelectionWindowRoutes);
app.use(
  "/api/v1/settings/assignmentTypes",
  require("./routes/assignmentTypeRoutes")
);
app.use("/api/v1/specialities", require("./routes/specialityRoutes"));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/teachers", require("./routes/teacherRoutes"));

app.use("/api/v1/teamsOffers", teamOfferRouter);
app.use("/api/v1/teamApplications", teamApplicationRouter);
app.use("/api/v1", projectApplicationRoutes);

app.use("/api/v1/projectsOffers", require("./routes/projectOfferRoutes"));


app.use('/api/v1/skills', skillRoutes);

app.use(
  "/api/v1/projects/:projectId/sprints",
  require("./routes/sprintRoutes")
);

app.use("/api/v1/sprints/:sprintId/notes", require("./routes/noteRoutes"));

app.use(
  "/api/v1/sprints/:sprintId/deliverables",
  require("./routes/deliverableRoutes")
);

app.use("/api/v1/import", importRoutes);

app.all("*", (req, res) => {
  return res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});
module.exports = app;
