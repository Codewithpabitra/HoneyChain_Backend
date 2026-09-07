import { Router } from "express";
import { batchController } from "../controllers/batch.controller.js";

const router = Router();

// Batch lifecycle write operations
router.post("/", batchController.registerBatch);
router.post("/:batchId/quality", batchController.certifyBatch);
router.post("/:batchId/transfer", batchController.transferCustody);
router.post("/:batchId/recall", batchController.recallBatch);

export default router;
