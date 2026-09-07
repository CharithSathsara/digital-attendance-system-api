import express from "express";
import session from "express-session";
import cors from "cors";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import classRoutes from "./routes/class.routes";
import sessionRoutes from "./routes/session.routes";
import studentRoutes from "./routes/student.routes";
import paymentRoutes from "./routes/payment.routes";
import enrollmentRoutes from "./routes/enrollment.routes";

export const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use(
  "/api/v1/auth",
  authRoutes
);

app.use(
  "/api/v1/classes",
  classRoutes
);

app.use(
  "/api/v1/sessions",
  sessionRoutes
);

app.use(
  "/api/v1/students",
  studentRoutes
);

app.use(
  "/api/v1/payments",
  paymentRoutes
);

app.use(
  "/api/v1/enrollments",
  enrollmentRoutes
);

app.use(errorHandler);