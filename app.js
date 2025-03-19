const express = require("express");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");
const path = require("path");
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");
const studentRouter = require("./routes/studentRoutes");
const teamOfferRouter = require("./routes/teamOfferRoutes");
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
app.use("/api/v1/users", userRouter);
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/teamsOffers", teamOfferRouter);

app.all("*", (req, res) => {
  return res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});
module.exports = app;
