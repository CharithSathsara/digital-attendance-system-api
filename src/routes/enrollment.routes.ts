import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getCurrentUser, requireAuth } from "../middleware/auth";
import * as paymentService from "../services/payment.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const items =
      await paymentService.listPayments(
        getCurrentUser(req),
        Number(req.params.id)
      );

    res.json({ items });
  })
);

export default router;