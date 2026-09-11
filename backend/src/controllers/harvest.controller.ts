import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Harvest } from "../models/Harvest.js";
import { Hive } from "../models/Hive.js";
import AppError from "../utils/AppError.js";

export class HarvestController {
  /**
   * POST /api/harvests
   * Create a new honey harvest record.
   */
  public createHarvest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        harvestId: inputHarvestId,
        hiveId,
        quantityGrams,
        harvestTimestamp,
        floralOrigin,
        batchId,
        notes,
      } = req.body;

      if (!hiveId || typeof hiveId !== "string" || !hiveId.trim()) {
        return next(new AppError("hiveId is required", 400));
      }

      const parsedQuantity = Number(quantityGrams);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return next(new AppError("quantityGrams must be a positive number", 400));
      }

      // Check hive existence
      const hive = await Hive.findOne({ hiveId: hiveId.trim() });
      if (!hive) {
        return next(new AppError(`Hive '${hiveId}' not found`, 404));
      }

      const harvestId =
        inputHarvestId?.trim().toUpperCase() ||
        `HRV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const existing = await Harvest.findOne({ harvestId });
      if (existing) {
        return next(new AppError(`Harvest with ID '${harvestId}' already exists`, 409));
      }

      const userOrgId = (req.user?.organizationId as any)?._id || req.user?.organizationId;
      const organizationId = userOrgId || (hive as any).organizationId;

      const beekeeperId =
        req.body.beekeeperId?.trim() ||
        req.user?.walletAddress ||
        req.user?._id?.toString() ||
        req.user?.email ||
        hive.beekeeper;

      const harvest = new Harvest({
        harvestId,
        hiveId: hive.hiveId,
        apiaryId: hive.apiaryId,
        beekeeperId,
        organizationId,
        quantityGrams: parsedQuantity,
        harvestTimestamp: harvestTimestamp ? Number(harvestTimestamp) : Date.now(),
        floralOrigin: floralOrigin?.trim() || undefined,
        batchId: batchId?.trim() || undefined,
        notes: notes?.trim() || undefined,
      });

      await harvest.save();

      res.status(201).json({
        success: true,
        message: "Harvest created successfully",
        data: harvest,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/harvests
   * List harvests with filters, pagination, and tenant isolation.
   */
  public getHarvests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const filter: Record<string, any> = {};

      // Tenant Scoping
      const userRole = req.user?.role;
      const userOrgId = (req.user?.organizationId as any)?._id || req.user?.organizationId;
      if (userRole !== "admin" && userRole !== "auditor" && userOrgId) {
        filter.organizationId = userOrgId;
      }

      if (req.query.hiveId) {
        filter.hiveId = (req.query.hiveId as string).trim();
      }
      if (req.query.batchId) {
        filter.batchId = (req.query.batchId as string).trim();
      }
      if (req.query.floralOrigin) {
        filter.floralOrigin = new RegExp((req.query.floralOrigin as string).trim(), "i");
      }

      const [harvests, total] = await Promise.all([
        Harvest.find(filter).sort({ harvestTimestamp: -1 }).skip(skip).limit(limit).lean(),
        Harvest.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        count: harvests.length,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
        data: harvests,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/harvests/:harvestId
   * Retrieve harvest details by ID.
   */
  public getHarvestById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawHarvestId = (Array.isArray(req.params.harvestId)
        ? req.params.harvestId[0]
        : req.params.harvestId) as string;

      const query: Record<string, any> = {};
      if (mongoose.Types.ObjectId.isValid(rawHarvestId)) {
        query.$or = [{ harvestId: rawHarvestId }, { _id: rawHarvestId }];
      } else {
        query.harvestId = rawHarvestId.toUpperCase();
      }

      const harvest = await Harvest.findOne(query).lean();
      if (!harvest) {
        return next(new AppError(`Harvest '${rawHarvestId}' not found`, 404));
      }

      // Tenant scoping
      const userRole = req.user?.role;
      const userOrgId = (req.user?.organizationId as any)?._id || req.user?.organizationId;
      if (
        userRole !== "admin" &&
        userRole !== "auditor" &&
        userOrgId &&
        harvest.organizationId &&
        harvest.organizationId.toString() !== userOrgId.toString()
      ) {
        return next(new AppError("You do not have permission to view this harvest", 403));
      }

      res.status(200).json({
        success: true,
        data: harvest,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const harvestController = new HarvestController();
export default harvestController;
