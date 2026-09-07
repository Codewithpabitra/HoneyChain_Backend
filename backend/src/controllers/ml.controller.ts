import { Request, Response, NextFunction } from "express";
import { mlService } from "../services/ml.service.js";
import AppError from "../utils/AppError.js";

export class MLController {
  /**
   * POST /api/ml/predict/:hiveId
   * Triggers real-time ML inference for the specified hive.
   */
  public predictHiveHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { hiveId } = req.params;
      if (!hiveId || typeof hiveId !== "string" || !hiveId.trim()) {
        return next(new AppError("Valid hiveId parameter is required", 400));
      }

      const persist = req.query.persist !== "false";
      const result = await mlService.predictForHive(hiveId, { persist });

      if (!result.success) {
        if (result.status === "INSUFFICIENT_DATA") {
          return res.status(200).json({
            success: false,
            status: "INSUFFICIENT_DATA",
            message: result.message,
            data: null,
          });
        }
        if (result.status === "SERVICE_UNAVAILABLE" || result.status === "SERVICE_TIMEOUT") {
          return res.status(503).json({
            success: false,
            status: result.status,
            message: result.message,
            data: null,
          });
        }
        return res.status(422).json({
          success: false,
          status: result.status,
          message: result.message,
          data: result.modelOutput || null,
        });
      }

      return res.status(200).json({
        success: true,
        status: "OK",
        data: {
          prediction: result.prediction,
          modelOutput: result.modelOutput,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/ml/predictions/:hiveId
   * Retrieves paginated prediction history for a hive.
   */
  public getPredictions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { hiveId } = req.params;
      if (!hiveId || typeof hiveId !== "string" || !hiveId.trim()) {
        return next(new AppError("Valid hiveId parameter is required", 400));
      }

      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);

      const result = await mlService.getPredictionsByHive(hiveId, limit, page);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/ml/latest/:hiveId
   * Retrieves the most recent prediction for a hive.
   */
  public getLatestPrediction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { hiveId } = req.params;
      if (!hiveId || typeof hiveId !== "string" || !hiveId.trim()) {
        return next(new AppError("Valid hiveId parameter is required", 400));
      }

      const prediction = await mlService.getLatestPrediction(hiveId);
      if (!prediction) {
        return res.status(404).json({
          success: false,
          status: "NOT_FOUND",
          message: `No AI predictions found for hive '${hiveId.trim()}'`,
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        data: prediction,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/ml/health
   * Internal inference microservice health status check.
   */
  public getHealth = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const health = await mlService.checkHealth();
      return res.status(health.healthy ? 200 : 503).json({
        success: health.healthy,
        data: health,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const mlController = new MLController();
export default mlController;
