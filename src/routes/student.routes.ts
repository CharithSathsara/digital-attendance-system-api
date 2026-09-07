import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getCurrentUser, requireAuth } from "../middleware/auth";
import * as studentService from "../services/student.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items =
      await studentService.listStudents(
        getCurrentUser(req)
      );

    res.json({ items });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result =
      await studentService.getStudent(
        getCurrentUser(req),
        Number(req.params.id)
      );

    res.json(result);
  })
);

router.post(
  "/:id/qr",
  asyncHandler(async (req, res) => {
    const result =
      await studentService.issueQr(
        getCurrentUser(req),
        Number(req.params.id)
      );

    res.status(201).json(result);
  })
);

export default router;