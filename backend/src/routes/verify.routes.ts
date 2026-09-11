import { Router } from "express";
import { batchController } from "../controllers/batch.controller.js";

const router = Router();

// Public consumer & auditor provenance verification
router.get("/:batchId", batchController.verifyBatch);

export default router;
