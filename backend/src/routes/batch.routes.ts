import { Router } from "express";
import { batchController } from "../controllers/batch.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Batch retrieval & listing - Authenticated
router.get("/", authenticate, batchController.getBatches);
router.get("/:batchId", authenticate, batchController.getBatchById);

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

// 2b. Laboratory uploads certified assay PDF report
router.post(
  "/:batchId/certificate",
  authenticate,
  authorize("lab", "admin"),
  batchController.uploadCertificate
);

// 3. Custodians (Beekeeper, Processor, Distributor) transfer batch custody
router.post(
  "/:batchId/transfer",
  authenticate,
  authorize("beekeeper", "processor", "distributor", "transporter"),
  batchController.transferCustody
);

// 3b. Custodians deliver batch to final retail / distribution destination
router.post(
  "/:batchId/deliver",
  authenticate,
  authorize("beekeeper", "processor", "distributor", "transporter", "admin"),
  batchController.deliverBatch
);

// 4. Auditor initiates emergency recall
router.post(
  "/:batchId/recall",
  authenticate,
  authorize("auditor", "admin"),
  batchController.recallBatch
);

// Packaging QR code generation (PNG Data URL & SVG) - Processor Only
router.get(
  "/:batchId/qr",
  authenticate,
  authorize("processor"),
  batchController.getBatchQrCode
);

export default router;
