import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler";
import { getCurrentUser, requireAuth } from "../middleware/auth";
import * as authService from "../services/auth.service";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await authService.login(
      input.email,
      input.password
    );

    req.session.user = user;

    res.json({ user });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.clearCookie("connect.sid");

    res.status(204).send();
  })
);

router.get(
  "/me",
  requireAuth,
  (req, res) => {
    res.json({
      user: getCurrentUser(req),
    });
  }
);

export default router;