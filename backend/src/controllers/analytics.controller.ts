import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Apiary } from "../models/Apiary.js";
import { Hive } from "../models/Hive.js";
import { Batch } from "../models/Batch.js";
import { Harvest } from "../models/Harvest.js";
import { Alert } from "../models/Alert.js";
import { SensorReading } from "../models/SensorReading.js";
import { Organization } from "../models/Organization.js";
import { AIPrediction } from "../models/AIPrediction.js";
import AppError from "../utils/AppError.js";

export class AnalyticsController {
  /**
   * GET /api/analytics/dashboard
   * Returns operational analytics tailored to the requesting user's role and organization.
   */
  public getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const role = user?.role || "admin";
      const userOrgId = (user?.organizationId as any)?._id || user?.organizationId;

      const isAuthorityOrAdmin = role === "admin" || role === "auditor";

      // Common or Role-specific Scopes
      const orgFilter = !isAuthorityOrAdmin && userOrgId ? { organizationId: userOrgId } : {};

      // 1. Apiary & Hive Metrics
      const hiveMatch: Record<string, any> = {};
      if (!isAuthorityOrAdmin) {
        const tenantOr: any[] = [];
        if (userOrgId) tenantOr.push({ organizationId: userOrgId });
        if (user?.email) tenantOr.push({ beekeeper: user.email });
        const wallet = (user as any)?.walletAddress || (user?.organizationId as any)?.walletAddress;
        if (wallet) tenantOr.push({ beekeeper: { $regex: new RegExp(`^${wallet}$`, "i") } });
        if (user?._id) tenantOr.push({ createdBy: user._id });
        if (tenantOr.length > 0) {
          hiveMatch.$or = tenantOr;
        }
      }

      const [hiveStats] = await Hive.aggregate([
        { $match: hiveMatch },
        {
          $group: {
            _id: null,
            totalHives: { $sum: 1 },
            activeHives: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            inactiveHives: {
              $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
            },
            healthyHives: {
              $sum: {
                $cond: [
                  { $eq: ["$currentHealthSummary.status", "healthy"] },
                  1,
                  0,
                ],
              },
            },
            avgHealthScore: {
              $avg: "$currentHealthSummary.healthScore",
            },
          },
        },
      ]) || [null];

      // 2. Alert Metrics
      const alertMatch: Record<string, any> = { isResolved: false };
      if (!isAuthorityOrAdmin && userOrgId) {
        alertMatch.organizationId = userOrgId;
      }

      const [alertStats] = await Alert.aggregate([
        { $match: alertMatch },
        {
          $group: {
            _id: null,
            activeAlerts: { $sum: 1 },
            criticalAlerts: {
              $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
            },
            warningAlerts: {
              $sum: { $cond: [{ $eq: ["$severity", "warning"] }, 1, 0] },
            },
            infoAlerts: {
              $sum: { $cond: [{ $eq: ["$severity", "info"] }, 1, 0] },
            },
          },
        },
      ]) || [null];

      // 3. Batch Metrics
      const batchMatch: Record<string, any> = {};
      if (!isAuthorityOrAdmin) {
        const wallet = (user as any)?.walletAddress || (user?.organizationId as any)?.walletAddress;
        const batchOr: any[] = [];
        if (userOrgId) batchOr.push({ organizationId: userOrgId });
        if (wallet) {
          const addrLower = wallet.toLowerCase();
          batchOr.push({ producer: { $regex: new RegExp(`^${addrLower}$`, "i") } });
          batchOr.push({ creatorAddress: { $regex: new RegExp(`^${addrLower}$`, "i") } });
          batchOr.push({ currentCustodian: { $regex: new RegExp(`^${addrLower}$`, "i") } });
          batchOr.push({ currentOwner: { $regex: new RegExp(`^${addrLower}$`, "i") } });
        }
        if (user?._id) batchOr.push({ createdBy: user._id });
        if (batchOr.length > 0) {
          batchMatch.$or = batchOr;
        }
      }

      const [batchStats] = await Batch.aggregate([
        { $match: batchMatch },
        {
          $group: {
            _id: null,
            totalBatches: { $sum: 1 },
            createdBatches: {
              $sum: { $cond: [{ $eq: ["$status", "Created"] }, 1, 0] },
            },
            inTransitBatches: {
              $sum: { $cond: [{ $eq: ["$status", "InTransit"] }, 1, 0] },
            },
            deliveredBatches: {
              $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] },
            },
            recalledBatches: {
              $sum: { $cond: [{ $eq: ["$status", "Recalled"] }, 1, 0] },
            },
            testedBatches: {
              $sum: {
                $cond: [
                  { $eq: ["$qualityDetails.tested", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuantityKg: { $sum: "$totalQuantity" },
          },
        },
      ]) || [null];

      // 4. Harvest Metrics
      const harvestMatch: Record<string, any> = {};
      if (!isAuthorityOrAdmin) {
        const harvestOr: any[] = [];
        if (userOrgId) harvestOr.push({ organizationId: userOrgId });
        if (user?.email) harvestOr.push({ beekeeperId: user.email });
        if (user?._id) harvestOr.push({ beekeeperId: user._id.toString() });
        if (harvestOr.length > 0) {
          harvestMatch.$or = harvestOr;
        }
      }

      const [harvestStats] = await Harvest.aggregate([
        { $match: harvestMatch },
        {
          $group: {
            _id: null,
            totalHarvests: { $sum: 1 },
            totalQuantityGrams: { $sum: "$quantityGrams" },
          },
        },
      ]) || [null];

      // 5. IoT / Sensor Readings Summary (Last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [telemetryStats] = await SensorReading.aggregate([
        {
          $facet: {
            totalReadings: [{ $count: "count" }],
            recent24hReadings: [
              { $match: { timestamp: { $gte: oneDayAgo } } },
              { $count: "count" },
            ],
          },
        },
      ]);

      // 6. Organization Counts (for Admin/Auditor)
      let orgCount = 0;
      if (isAuthorityOrAdmin) {
        orgCount = await Organization.countDocuments();
      }

      // 7. AI Predictions Summary
      const [aiStats] = await AIPrediction.aggregate([
        {
          $group: {
            _id: null,
            totalPredictions: { $sum: 1 },
            anomaliesDetected: {
              $sum: { $cond: [{ $eq: ["$prediction.anomalyDetected", true] }, 1, 0] },
            },
            highStressRiskCount: {
              $sum: { $cond: [{ $eq: ["$prediction.stressRisk", "HIGH"] }, 1, 0] },
            },
          },
        },
      ]) || [null];

      const data = {
        role,
        hives: {
          total: hiveStats?.totalHives || 0,
          active: hiveStats?.activeHives || 0,
          inactive: hiveStats?.inactiveHives || 0,
          healthy: hiveStats?.healthyHives || 0,
          averageHealthScore: hiveStats?.avgHealthScore ? Math.round(hiveStats.avgHealthScore * 10) / 10 : 0,
        },
        alerts: {
          active: alertStats?.activeAlerts || 0,
          critical: alertStats?.criticalAlerts || 0,
          warning: alertStats?.warningAlerts || 0,
          info: alertStats?.infoAlerts || 0,
        },
        batches: {
          total: batchStats?.totalBatches || 0,
          created: batchStats?.createdBatches || 0,
          inTransit: batchStats?.inTransitBatches || 0,
          delivered: batchStats?.deliveredBatches || 0,
          recalled: batchStats?.recalledBatches || 0,
          tested: batchStats?.testedBatches || 0,
          totalQuantityKg: batchStats?.totalQuantityKg || 0,
        },
        harvests: {
          total: harvestStats?.totalHarvests || 0,
          totalQuantityGrams: harvestStats?.totalQuantityGrams || 0,
          totalQuantityKg: Math.round(((harvestStats?.totalQuantityGrams || 0) / 1000) * 100) / 100,
        },
        telemetry: {
          totalReadings: telemetryStats?.totalReadings[0]?.count || 0,
          last24hReadings: telemetryStats?.recent24hReadings[0]?.count || 0,
        },
        ai: {
          totalPredictions: aiStats?.totalPredictions || 0,
          anomaliesDetected: aiStats?.anomaliesDetected || 0,
          highStressRiskCount: aiStats?.highStressRiskCount || 0,
        },
        ...(isAuthorityOrAdmin && {
          organizations: {
            total: orgCount,
          },
        }),
      };

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/analytics/clusters
   * Aggregates apiaries by geographic region into beekeeping clusters.
   */
  public getClusters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const isAuthorityOrAdmin = user?.role === "admin" || user?.role === "auditor";
      const userOrgId = (user?.organizationId as any)?._id || user?.organizationId;

      const matchStage: Record<string, any> = {};
      if (!isAuthorityOrAdmin && userOrgId) {
        matchStage.organizationId = userOrgId;
      }

      const clusters = await Apiary.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $lookup: {
            from: "hives",
            localField: "_id",
            foreignField: "apiary",
            as: "hives",
          },
        },
        {
          $group: {
            _id: "$location.region",
            region: { $first: "$location.region" },
            apiaryCount: { $sum: 1 },
            apiaries: {
              $push: {
                id: "$_id",
                apiaryId: "$apiaryId",
                name: "$name",
                location: "$location",
                hiveCount: { $size: "$hives" },
              },
            },
            totalHives: { $sum: { $size: "$hives" } },
            avgLatitude: { $avg: "$location.latitude" },
            avgLongitude: { $avg: "$location.longitude" },
            farmers: { $addToSet: "$beekeeper" },
          },
        },
        {
          $project: {
            _id: 0,
            region: "$_id",
            apiaryCount: 1,
            totalHives: 1,
            avgLatitude: { $round: ["$avgLatitude", 4] },
            avgLongitude: { $round: ["$avgLongitude", 4] },
            farmerCount: { $size: "$farmers" },
            apiaries: 1,
          },
        },
        { $sort: { totalHives: -1 } },
      ]);

      const activeClusters = clusters.length;
      const farmersCovered = clusters.reduce((acc, c) => acc + (c.farmerCount || 0), 0);
      const hivesCovered = clusters.reduce((acc, c) => acc + (c.totalHives || 0), 0);

      res.status(200).json({
        success: true,
        summary: {
          activeClusters,
          farmersCovered,
          hivesCovered,
        },
        data: clusters,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const analyticsController = new AnalyticsController();
export default analyticsController;
