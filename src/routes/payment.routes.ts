import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler";
import { getCurrentUser, requireAuth, requireRole } from "../middleware/auth";
import * as paymentService from "../services/payment.service";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req, res) => {
    const input = z.object({
      enrollmentId: z.number().int().positive(),
      billingMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
      amount: z.number().nonnegative(),
    }).parse(req.body);

    const result =
      await paymentService.recordPayment(
        getCurrentUser(req),
        input
      );

    res.status(201).json(result);
  })
);

export default router;