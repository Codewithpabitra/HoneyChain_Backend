import { Router } from "express";
import { iotController } from "../controllers/iot.controller.js";

const router = Router();

// Ingestion endpoint for IoT devices / simulator
router.post("/telemetry", iotController.ingestTelemetry);

export default router;
