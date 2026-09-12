import { Router } from "express";
import { harvestController } from "../controllers/harvest.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Require authentication for all harvest management routes
router.use(authenticate);

router
  .route("/")
  .get(harvestController.getHarvests)
  .post(authorize("beekeeper", "admin"), harvestController.createHarvest);

router
  .route("/:harvestId")
  .get(harvestController.getHarvestById);

export default router;
