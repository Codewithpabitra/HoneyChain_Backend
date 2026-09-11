import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// All analytics endpoints require authentication
router.use(authenticate);

router.get("/dashboard", analyticsController.getDashboardStats);
router.get("/clusters", analyticsController.getClusters);

export default router;
