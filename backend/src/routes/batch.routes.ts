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

// 3a. Two-Step Custody Handshake: Propose Transfer
router.post(
  "/:batchId/custody/propose",
  authenticate,
  authorize("beekeeper", "lab", "processor", "distributor", "transporter", "admin"),
  batchController.proposeCustodyTransfer
);

// 3b. Two-Step Custody Handshake: Accept Transfer
router.post(
  "/:batchId/custody/accept",
  authenticate,
  authorize("lab", "processor", "distributor", "transporter", "admin"),
  batchController.acceptCustody
);

// 3c. Custodians deliver batch to final retail / distribution destination
router.post(
  "/:batchId/deliver",
  authenticate,
  authorize("beekeeper", "processor", "distributor", "transporter", "admin"),
  batchController.deliverBatch
);

// 4. Stakeholder Auditor Review Request
router.post(
  "/:batchId/review-request",
  authenticate,
  authorize("beekeeper", "lab", "processor", "distributor", "transporter", "auditor", "admin"),
  batchController.requestAuditorReview
);

// 4b. Auditor Clears Review Request
router.post(
  "/:batchId/review-request/:requestId/clear",
  authenticate,
  authorize("auditor", "admin"),
  batchController.clearAuditorReview
);

// 4c. Auditor Formally Rejects and Recalls Batch
router.post(
  "/:batchId/reject",
  authenticate,
  authorize("auditor", "admin"),
  batchController.rejectBatch
);

// 4d. Auditor emergency recall (backward-compatible)
router.post(
  "/:batchId/recall",
  authenticate,
  authorize("auditor", "admin"),
  batchController.recallBatch
);

// Packaging QR code generation (PNG Data URL & SVG) - Stakeholders
router.get(
  "/:batchId/qr",
  authenticate,
  authorize("processor", "beekeeper", "admin", "auditor", "distributor"),
  batchController.getBatchQrCode
);

// Public Certificate / Lab Report PDF serving endpoint
router.get("/:batchId/certificate", batchController.getBatchCertificate);

export default router;
