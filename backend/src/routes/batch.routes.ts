import { Router } from "express";
import { batchController } from "../controllers/batch.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Batch lifecycle write operations - Role Protected
// 1. Beekeeper registers new harvest batch
router.post(
  "/",
  authenticate,
  authorize("beekeeper"),
  batchController.registerBatch
);

// 2. Laboratory submits quality certification assay
router.post(
  "/:batchId/quality",
  authenticate,
  authorize("lab"),
  batchController.certifyBatch
);

// 3. Custodians (Beekeeper, Processor, Transporter) transfer batch custody
router.post(
  "/:batchId/transfer",
  authenticate,
  authorize("beekeeper", "processor", "transporter"),
  batchController.transferCustody
);

// 4. Auditor initiates emergency recall
router.post(
  "/:batchId/recall",
  authenticate,
  authorize("auditor"),
  batchController.recallBatch
);

// Public batch QR code generation (PNG Data URL & SVG) - Consumers / Packaging
router.get("/:batchId/qr", batchController.getBatchQrCode);

export default router;
