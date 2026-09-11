import { Router } from "express";
import { apiaryController } from "../controllers/apiary.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Apiary management routes
router.post(
  "/",
  authenticate,
  authorize("beekeeper", "admin"),
  apiaryController.createApiary
);

router.get("/", authenticate, apiaryController.getApiaries);
router.get("/:id", authenticate, apiaryController.getApiaryById);

router.patch(
  "/:id",
  authenticate,
  authorize("beekeeper", "admin"),
  apiaryController.updateApiary
);

export default router;
