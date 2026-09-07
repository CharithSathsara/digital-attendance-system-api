import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler";
import { getCurrentUser, requireAuth, requireRole } from "../middleware/auth";
import * as classService from "../services/class.service";
import * as sessionService from "../services/session.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await classService.listClasses(
      getCurrentUser(req)
    );

    res.json({ items });
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = z.object({
      institutionId: z.number().int().positive(),
      teacherId: z.number().int().positive(),
      name: z.string().trim().min(1).max(200),
      fee: z.number().nonnegative(),
    }).parse(req.body);

    const result = await classService.createClass(
      getCurrentUser(req),
      input
    );

    res.status(201).json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await classService.getClass(
      getCurrentUser(req),
      Number(req.params.id)
    );

    res.json(result);
  })
);

router.get(
  "/:id/students",
  asyncHandler(async (req, res) => {
    const items = await classService.listStudents(
      getCurrentUser(req),
      Number(req.params.id)
    );

    res.json({ items });
  })
);

router.post(
  "/:id/students",
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req, res) => {
    const input = z.object({
      studentId: z.number().int().positive(),
    }).parse(req.body);

    const result =
      await classService.enrollStudent(
        getCurrentUser(req),
        Number(req.params.id),
        input.studentId
      );

    res.status(201).json(result);
  })
);

router.post(
  "/:id/sessions",
  requireRole("ADMIN", "STAFF", "TEACHER"),
  asyncHandler(async (req, res) => {
    const input = z.object({
      sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
      endTime: z.string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/)
        .optional(),
    }).parse(req.body);

    const result =
      await sessionService.createSession(
        getCurrentUser(req),
        Number(req.params.id),
        input
      );

    res.status(201).json(result);
  })
);

router.get(
  "/:id/sessions",
  asyncHandler(async (req, res) => {
    const items =
      await sessionService.listSessions(
        getCurrentUser(req),
        Number(req.params.id)
      );

    res.json({ items });
  })
);

export default router;