import { Router } from "express";
import { iotController } from "../controllers/iot.controller.js";
import { triggerSimulationCycle } from "../scripts/simulateIoT.js";

const router = Router();

// Ingestion endpoint for IoT devices / simulator
router.post("/telemetry", iotController.ingestTelemetry);

// Interactive / on-demand trigger for simulated telemetry cycle
router.all("/simulate", async (req, res) => {
  try {
    const result = await triggerSimulationCycle();
    res.json({
      success: result.success,
      message: `Simulation cycle completed: ${result.successful}/${result.total} readings ingested into MongoDB`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        message: err.message || "Failed to trigger simulation cycle",
      },
    });
  }
});

export default router;
