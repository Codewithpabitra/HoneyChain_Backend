import { Router } from "express";
import { mlController } from "../controllers/ml.controller.js";

const router = Router();

/**
 * @route   GET /api/ml/health
 * @desc    Check health and model status of the Python ML inference service
 * @access  Public
 */
router.get("/health", mlController.getHealth);

/**
 * @route   POST /api/ml/predict/:hiveId
 * @desc    Trigger real-time ML inference for a hive
 * @access  Public / Beekeeper
 */
router.post("/predict/:hiveId", mlController.predictHiveHealth);

/**
 * @route   GET /api/ml/predictions/:hiveId
 * @desc    Get paginated historical predictions for a hive
 * @access  Public
 */
router.get("/predictions/:hiveId", mlController.getPredictions);

/**
 * @route   GET /api/ml/latest/:hiveId
 * @desc    Get latest prediction for a hive
 * @access  Public
 */
router.get("/latest/:hiveId", mlController.getLatestPrediction);

export default router;
