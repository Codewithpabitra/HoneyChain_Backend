import { Router } from "express";
import { iotController } from "../controllers/iot.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Ingestion endpoint for IoT devices / standalone simulator
router.post("/telemetry", iotController.ingestTelemetry);

// Recent telemetry readings from Redis rolling buffer (latest 10)
router.get("/telemetry/:hiveId/recent", authenticate, iotController.getRecentTelemetry);

// Time-series telemetry query for frontend charts
router.get("/telemetry/:hiveId", iotController.getTelemetryHistory);

// Edge hardware device diagnostics
router.get("/devices/:deviceId/status", iotController.getDeviceStatus);

// Interactive / on-demand trigger for simulated telemetry cycle (demo UI support)
router.all("/simulate", iotController.triggerDemoCycle);

export default router;
