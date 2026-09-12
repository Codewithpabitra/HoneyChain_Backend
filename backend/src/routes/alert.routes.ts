import { Router } from "express";
import { alertController } from "../controllers/alert.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Authenticated alert routes
router.get("/", authenticate, alertController.getAlerts);
router.patch("/:id/resolve", authenticate, alertController.resolveAlert);

export default router;
