import { Router } from "express";
import { hiveController } from "../controllers/hive.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Hive management routes
router.post(
  "/",
  authenticate,
  authorize("beekeeper", "admin"),
  hiveController.createHive
);

router.get("/", authenticate, hiveController.getHives);
router.get("/:hiveId", authenticate, hiveController.getHiveById);

router.patch(
  "/:hiveId",
  authenticate,
  authorize("beekeeper", "admin"),
  hiveController.updateHive
);

router.delete(
  "/:hiveId",
  authenticate,
  authorize("beekeeper", "admin"),
  hiveController.deleteHive
);

export default router;
