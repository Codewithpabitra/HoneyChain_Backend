import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Hive } from "../models/Hive.js";
import { Apiary } from "../models/Apiary.js";
import AppError from "../utils/AppError.js";

export class HiveController {
  /**
   * POST /api/hives
   * Beekeeper / Admin registers a new hive linked to an apiary.
   */
  public createHive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        hiveId: inputHiveId,
        apiary: inputApiary,
        apiaryId: inputApiaryId,
        hiveType = "Langstroth",
        beeSpecies = "Apis cerana indica",
        queenInfo,
        deviceMetadata,
        installationDate,
        notes,
      } = req.body;

      if (!inputHiveId || typeof inputHiveId !== "string" || !inputHiveId.trim()) {
        return next(new AppError("hiveId is required", 400));
      }

      const hiveId = inputHiveId.trim();

      const existingHive = await Hive.findOne({ hiveId });
      if (existingHive) {
        return next(new AppError(`Hive with ID '${hiveId}' already exists`, 409));
      }

      // Resolve parent apiary
      const apiaryIdentifier = inputApiary || inputApiaryId;
      if (!apiaryIdentifier) {
        return next(new AppError("Apiary reference (apiary or apiaryId) is required", 400));
      }

      const apiaryQuery = mongoose.isValidObjectId(apiaryIdentifier)
        ? { $or: [{ _id: apiaryIdentifier }, { apiaryId: apiaryIdentifier }] }
        : { apiaryId: apiaryIdentifier };

      const apiary = await Apiary.findOne(apiaryQuery);
      if (!apiary) {
        return next(new AppError(`Referenced apiary '${apiaryIdentifier}' not found`, 404));
      }

      // Tenant isolation: verify user belongs to same organization
      const isAdmin = req.user?.role === "admin" || req.user?.role === "auditor";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();

      if (!isAdmin && userOrgId && apiary.organizationId) {
        if (apiary.organizationId.toString() !== userOrgId) {
          return next(new AppError("Cannot add hives to an apiary outside your organization", 403));
        }
      }

      const beekeeper = req.user?.walletAddress || req.user?.email || apiary.beekeeper;
      const organizationId = (req.user?.organizationId as any)?._id || apiary.organizationId;

      const newHive = new Hive({
        hiveId,
        apiary: apiary._id,
        apiaryId: apiary.apiaryId,
        beekeeper,
        hiveType,
        beeSpecies,
        queenInfo,
        installationDate: installationDate ? new Date(installationDate) : new Date(),
        status: "active",
        deviceMetadata: {
          deviceId: deviceMetadata?.deviceId?.trim() || `ESP32-${hiveId}`,
          hardwareModel: deviceMetadata?.hardwareModel || "ESP32-WROOM-32U",
          firmwareVersion: deviceMetadata?.firmwareVersion || "v1.0.0",
          communicationProtocol: deviceMetadata?.communicationProtocol || "MQTT",
          batteryLevelPct: deviceMetadata?.batteryLevelPct ?? 100,
          lastPingAt: new Date(),
        },
        currentHealthSummary: {
          healthScore: 100,
          status: "healthy",
          stressIndex: 0,
          activeAlerts: [],
        },
        organizationId,
        createdBy: req.user?._id,
        notes: notes?.trim(),
      });

      await newHive.save();

      // Add to apiary's hives array
      if (!apiary.hives.includes(newHive._id as any)) {
        apiary.hives.push(newHive._id as any);
        await apiary.save();
      }

      return res.status(201).json({
        success: true,
        message: "Hive registered successfully",
        data: newHive,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/hives
   * Lists hives with filters, search, and tenant isolation.
   */
  public getHives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        apiaryId,
        status,
        healthStatus,
        search,
        page,
        limit,
      } = req.query as any;

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const query: Record<string, any> = {};

      if (apiaryId) {
        query.apiaryId = apiaryId.trim();
      }
      if (status) {
        query.status = status;
      }
      if (healthStatus) {
        query["currentHealthSummary.status"] = healthStatus;
      }
      if (search) {
        query.$or = [
          { hiveId: { $regex: new RegExp(search.trim(), "i") } },
          { beeSpecies: { $regex: new RegExp(search.trim(), "i") } },
          { "deviceMetadata.deviceId": { $regex: new RegExp(search.trim(), "i") } },
        ];
      }

      // Tenant isolation
      const isAdmin = req.user?.role === "admin" || req.user?.role === "auditor";
      const userOrgId = (req.user?.organizationId as any)?._id || req.user?.organizationId;
      const userWallet = (req.user as any)?.walletAddress || (req.user?.organizationId as any)?.walletAddress;
      const userEmail = req.user?.email;

      if (!isAdmin) {
        const tenantConditions: any[] = [];
        if (userOrgId) tenantConditions.push({ organizationId: userOrgId });
        if (userEmail) tenantConditions.push({ beekeeper: userEmail });
        if (userWallet) {
          tenantConditions.push({ beekeeper: { $regex: new RegExp(`^${userWallet}$`, "i") } });
        }
        if (req.user?._id) tenantConditions.push({ createdBy: req.user._id });

        if (tenantConditions.length > 0) {
          if (query.$or) {
            query.$and = [{ $or: tenantConditions }, { $or: query.$or }];
            delete query.$or;
          } else {
            query.$or = tenantConditions;
          }
        }
      }

      const [hives, total] = await Promise.all([
        Hive.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("apiary", "name location floraType")
          .populate("organizationId", "name walletAddress"),
        Hive.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: hives,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/hives/:hiveId
   * Retrieves single hive details with populated apiary.
   */
  public getHiveById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawHiveId = (Array.isArray(req.params.hiveId) ? req.params.hiveId[0] : req.params.hiveId) as string;
      const query = mongoose.isValidObjectId(rawHiveId)
        ? { $or: [{ _id: rawHiveId }, { hiveId: rawHiveId }] }
        : { hiveId: rawHiveId };

      const hive = await Hive.findOne(query)
        .populate("apiary", "name location floraType capacity")
        .populate("organizationId", "name walletAddress");

      if (!hive) {
        return next(new AppError(`Hive '${rawHiveId}' not found`, 404));
      }

      // Tenant isolation
      const isAdmin = req.user?.role === "admin" || req.user?.role === "auditor";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();
      const hiveOrgId = (hive.organizationId as any)?._id?.toString() || hive.organizationId?.toString();

      if (!isAdmin && userOrgId && hiveOrgId) {
        if (hiveOrgId !== userOrgId) {
          return next(new AppError("Cannot view hives outside your organization", 403));
        }
      }

      return res.status(200).json({
        success: true,
        data: hive,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * PATCH /api/hives/:hiveId
   * Updates hive attributes (status, queenInfo, deviceMetadata, notes).
   */
  public updateHive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawHiveId = (Array.isArray(req.params.hiveId) ? req.params.hiveId[0] : req.params.hiveId) as string;
      const query = mongoose.isValidObjectId(rawHiveId)
        ? { $or: [{ _id: rawHiveId }, { hiveId: rawHiveId }] }
        : { hiveId: rawHiveId };

      const hive = await Hive.findOne(query);
      if (!hive) {
        return next(new AppError(`Hive '${rawHiveId}' not found`, 404));
      }

      // Tenant isolation
      const isAdmin = req.user?.role === "admin";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();
      const hiveOrgId = (hive.organizationId as any)?._id?.toString() || hive.organizationId?.toString();

      if (!isAdmin && userOrgId && hiveOrgId) {
        if (hiveOrgId !== userOrgId) {
          return next(new AppError("Cannot modify hives outside your organization", 403));
        }
      }

      const { status, hiveType, beeSpecies, queenInfo, deviceMetadata, notes } = req.body;

      if (status) hive.status = status;
      if (hiveType) hive.hiveType = hiveType;
      if (beeSpecies) hive.beeSpecies = beeSpecies;
      if (notes !== undefined) hive.notes = notes;

      if (queenInfo) {
        hive.queenInfo = {
          ...hive.queenInfo,
          ...queenInfo,
        };
      }

      if (deviceMetadata) {
        hive.deviceMetadata = {
          deviceId: deviceMetadata.deviceId || hive.deviceMetadata?.deviceId || `ESP32-${hive.hiveId}`,
          hardwareModel: deviceMetadata.hardwareModel || hive.deviceMetadata?.hardwareModel,
          firmwareVersion: deviceMetadata.firmwareVersion || hive.deviceMetadata?.firmwareVersion,
          communicationProtocol: deviceMetadata.communicationProtocol || hive.deviceMetadata?.communicationProtocol || "MQTT",
          batteryLevelPct: deviceMetadata.batteryLevelPct ?? hive.deviceMetadata?.batteryLevelPct,
          lastPingAt: hive.deviceMetadata?.lastPingAt,
        };
      }

      await hive.save();

      return res.status(200).json({
        success: true,
        message: "Hive updated successfully",
        data: hive,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * DELETE /api/hives/:hiveId
   * Decommissions or removes a hive.
   */
  public deleteHive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawHiveId = (Array.isArray(req.params.hiveId) ? req.params.hiveId[0] : req.params.hiveId) as string;
      const query = mongoose.isValidObjectId(rawHiveId)
        ? { $or: [{ _id: rawHiveId }, { hiveId: rawHiveId }] }
        : { hiveId: rawHiveId };

      const hive = await Hive.findOne(query);
      if (!hive) {
        return next(new AppError(`Hive '${rawHiveId}' not found`, 404));
      }

      // Tenant isolation
      const isAdmin = req.user?.role === "admin";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();
      const hiveOrgId = (hive.organizationId as any)?._id?.toString() || hive.organizationId?.toString();

      if (!isAdmin && userOrgId && hiveOrgId) {
        if (hiveOrgId !== userOrgId) {
          return next(new AppError("Cannot delete hives outside your organization", 403));
        }
      }

      // Remove from parent apiary hives array
      await Apiary.updateOne({ _id: hive.apiary }, { $pull: { hives: hive._id } });

      await Hive.deleteOne({ _id: hive._id });

      return res.status(200).json({
        success: true,
        message: `Hive '${hive.hiveId}' deleted successfully`,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const hiveController = new HiveController();
export default hiveController;
