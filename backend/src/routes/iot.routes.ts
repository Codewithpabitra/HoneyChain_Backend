import { Router } from "express";
import { iotController } from "../controllers/iot.controller.js";

const router = Router();

// Ingestion endpoint for IoT devices / standalone simulator
router.post("/telemetry", iotController.ingestTelemetry);

// Time-series telemetry query for frontend charts
router.get("/telemetry/:hiveId", iotController.getTelemetryHistory);

// Edge hardware device diagnostics
router.get("/devices/:deviceId/status", iotController.getDeviceStatus);

// Interactive / on-demand trigger for simulated telemetry cycle (demo UI support)
router.all("/simulate", iotController.triggerDemoCycle);

export default router;
