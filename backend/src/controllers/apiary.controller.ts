import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Apiary } from "../models/Apiary.js";
import AppError from "../utils/AppError.js";

export class ApiaryController {
  /**
   * POST /api/apiaries
   * Beekeeper / Admin creates a new apiary sanctuary.
   */
  public createApiary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        apiaryId: inputApiaryId,
        name,
        location,
        floraType = [],
        capacity = 20,
        beekeeper: inputBeekeeper,
        beekeeperContact,
        notes,
      } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return next(new AppError("Apiary name is required", 400));
      }
      if (!location || location.latitude === undefined || location.longitude === undefined || !location.region) {
        return next(new AppError("Apiary location requires latitude, longitude, and region", 400));
      }

      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);

      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return next(new AppError("Latitude must be between -90 and 90", 400));
      }
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return next(new AppError("Longitude must be between -180 and 180", 400));
      }

      const apiaryId = inputApiaryId?.trim() || `APIARY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const existing = await Apiary.findOne({ apiaryId });
      if (existing) {
        return next(new AppError(`Apiary with ID '${apiaryId}' already exists`, 409));
      }

      const beekeeper = inputBeekeeper?.trim() || req.user?.walletAddress || req.user?.email || "unknown";
      const organizationId = (req.user?.organizationId as any)?._id || req.user?.organizationId;

      const newApiary = new Apiary({
        apiaryId,
        name: name.trim(),
        beekeeper,
        beekeeperContact,
        location: {
          latitude,
          longitude,
          region: location.region.trim(),
          address: location.address?.trim(),
          elevationMeters: location.elevationMeters ? Number(location.elevationMeters) : undefined,
          coordinates: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
        },
        floraType: Array.isArray(floraType) ? floraType : [floraType],
        capacity: Number(capacity) || 20,
        status: "active",
        hives: [],
        organizationId,
        createdBy: req.user?._id,
        notes: notes?.trim(),
      });

      await newApiary.save();

      return res.status(201).json({
        success: true,
        message: "Apiary created successfully",
        data: newApiary,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/apiaries
   * Lists apiaries with optional status/region filters, pagination, and tenant isolation.
   */
  public getApiaries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, region, page, limit } = req.query as any;

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const query: Record<string, any> = {};

      if (status) {
        query.status = status;
      }
      if (region) {
        query["location.region"] = { $regex: new RegExp(region.trim(), "i") };
      }

      // Tenant isolation: non-admins are scoped to their organization
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

      const [apiaries, total] = await Promise.all([
        Apiary.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("hives")
          .populate("organizationId", "name walletAddress"),
        Apiary.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: apiaries,
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
   * GET /api/apiaries/:id
   * Inspects detailed apiary profile with populated child hives.
   */
  public getApiaryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const query = mongoose.isValidObjectId(rawId)
        ? { $or: [{ _id: rawId }, { apiaryId: rawId }] }
        : { apiaryId: rawId };

      const apiary = await Apiary.findOne(query)
        .populate("hives")
        .populate("organizationId", "name walletAddress");

      if (!apiary) {
        return next(new AppError(`Apiary '${rawId}' not found`, 404));
      }

      // Tenant isolation
      const isAdmin = req.user?.role === "admin" || req.user?.role === "auditor";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();
      const apiaryOrgId = (apiary.organizationId as any)?._id?.toString() || apiary.organizationId?.toString();

      if (!isAdmin && userOrgId && apiaryOrgId) {
        if (apiaryOrgId !== userOrgId) {
          return next(new AppError("Cannot view apiaries outside your organization", 403));
        }
      }

      return res.status(200).json({
        success: true,
        data: apiary,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * PATCH /api/apiaries/:id
   * Updates apiary attributes.
   */
  public updateApiary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const query = mongoose.isValidObjectId(rawId)
        ? { $or: [{ _id: rawId }, { apiaryId: rawId }] }
        : { apiaryId: rawId };

      const apiary = await Apiary.findOne(query);
      if (!apiary) {
        return next(new AppError(`Apiary '${rawId}' not found`, 404));
      }

      // Tenant isolation
      const isAdmin = req.user?.role === "admin";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();
      const apiaryOrgId = (apiary.organizationId as any)?._id?.toString() || apiary.organizationId?.toString();

      if (!isAdmin && userOrgId && apiaryOrgId) {
        if (apiaryOrgId !== userOrgId) {
          return next(new AppError("Cannot modify apiaries outside your organization", 403));
        }
      }

      const { name, location, floraType, capacity, status, notes } = req.body;

      if (name) apiary.name = name.trim();
      if (status) apiary.status = status;
      if (capacity) apiary.capacity = Number(capacity);
      if (notes !== undefined) apiary.notes = notes;
      if (floraType) apiary.floraType = Array.isArray(floraType) ? floraType : [floraType];

      if (location) {
        if (location.region) apiary.location.region = location.region.trim();
        if (location.address !== undefined) apiary.location.address = location.address.trim();
        if (location.elevationMeters !== undefined) apiary.location.elevationMeters = Number(location.elevationMeters);
        if (location.latitude !== undefined && location.longitude !== undefined) {
          apiary.location.latitude = Number(location.latitude);
          apiary.location.longitude = Number(location.longitude);
          apiary.location.coordinates = {
            type: "Point",
            coordinates: [Number(location.longitude), Number(location.latitude)],
          };
        }
      }

      await apiary.save();

      return res.status(200).json({
        success: true,
        message: "Apiary updated successfully",
        data: apiary,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const apiaryController = new ApiaryController();
export default apiaryController;
