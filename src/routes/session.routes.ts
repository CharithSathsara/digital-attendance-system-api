import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler";
import { getCurrentUser, requireAuth } from "../middleware/auth";
import * as sessionService from "../services/session.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/:id/open",
  asyncHandler(async (req, res) => {
    const result =
      await sessionService.changeStatus(
        getCurrentUser(req),
        Number(req.params.id),
        "OPEN"
      );

    res.json(result);
  })
);

router.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const result =
      await sessionService.changeStatus(
        getCurrentUser(req),
        Number(req.params.id),
        "CLOSED"
      );

    res.json(result);
  })
);

router.post(
  "/:id/attendance",
  asyncHandler(async (req, res) => {
    const input = z.object({
      qrToken: z.string().min(1),
    }).parse(req.body);

    const result =
      await sessionService.recordAttendance(
        getCurrentUser(req),
        Number(req.params.id),
        input.qrToken
      );

    res.status(201).json(result);
  })
);

export default router;