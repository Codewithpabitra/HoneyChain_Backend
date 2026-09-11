import { Request, Response, NextFunction } from "express";
import { SensorReading, Hive } from "../models/index.js";
import alertService from "../services/alert.service.js";
import AppError from "../utils/AppError.js";

export class IoTController {
  /**
   * POST /api/iot/telemetry
   * Ingests simulated or physical IoT device telemetry from edge gateways.
   */
  public ingestTelemetry = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        deviceId,
        hiveId,
        timestamp,
        temperature,
        humidity,
        weightKg,
        soundFrequencyHz,
        acousticsDb,
        batteryLevelPct,
        ambientTemperature,
        ambientHumidity,
        flow,
        beeInCount,
        beeOutCount,
        metadata = {},
      } = req.body;

      // 1. Validate required fields presence
      if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
        return next(new AppError("deviceId is required and must be a non-empty string", 400));
      }
      if (!hiveId || typeof hiveId !== "string" || !hiveId.trim()) {
        return next(new AppError("hiveId is required and must be a non-empty string", 400));
      }
      if (timestamp === undefined || timestamp === null) {
        return next(new AppError("timestamp is required (ISO 8601 string or Unix epoch ms)", 400));
      }

      // 2. Validate timestamp format and clock drift
      const parsedTimestamp = new Date(timestamp);
      if (isNaN(parsedTimestamp.getTime())) {
        return next(new AppError("Invalid timestamp format. Must be a valid date or epoch time", 400));
      }

      // Disallow timestamps more than 10 minutes in the future
      const nowMs = Date.now();
      if (parsedTimestamp.getTime() > nowMs + 10 * 60 * 1000) {
        return next(new AppError("Telemetry timestamp cannot be in the future beyond clock drift threshold", 400));
      }

      // 3. Validate numeric metrics & realistic physical bounds
      if (typeof temperature !== "number" || isNaN(temperature)) {
        return next(new AppError("temperature is required and must be a valid number", 400));
      }
      if (temperature < -40 || temperature > 70) {
        return next(new AppError("temperature out of plausible range (-40°C to 70°C)", 400));
      }

      if (typeof humidity !== "number" || isNaN(humidity)) {
        return next(new AppError("humidity is required and must be a valid number", 400));
      }
      if (humidity < 0 || humidity > 100) {
        return next(new AppError("humidity out of plausible range (0% to 100%)", 400));
      }

      if (typeof weightKg !== "number" || isNaN(weightKg)) {
        return next(new AppError("weightKg is required and must be a valid number", 400));
      }
      if (weightKg < 0 || weightKg > 300) {
        return next(new AppError("weightKg out of plausible range (0 kg to 300 kg)", 400));
      }

      if (typeof batteryLevelPct !== "number" || isNaN(batteryLevelPct)) {
        return next(new AppError("batteryLevelPct is required and must be a valid number", 400));
      }
      if (batteryLevelPct < 0 || batteryLevelPct > 100) {
        return next(new AppError("batteryLevelPct out of range (0% to 100%)", 400));
      }

      // 4. Validate optional acoustic and environmental measurements
      if (soundFrequencyHz !== undefined) {
        if (typeof soundFrequencyHz !== "number" || soundFrequencyHz < 0 || soundFrequencyHz > 5000) {
          return next(new AppError("soundFrequencyHz must be a positive number between 0 and 5000 Hz", 400));
        }
      }

      if (acousticsDb !== undefined) {
        if (typeof acousticsDb !== "number" || acousticsDb < 0 || acousticsDb > 140) {
          return next(new AppError("acousticsDb must be a positive number between 0 and 140 dB", 400));
        }
      }

      if (ambientTemperature !== undefined) {
        if (typeof ambientTemperature !== "number" || ambientTemperature < -50 || ambientTemperature > 70) {
          return next(new AppError("ambientTemperature out of plausible range (-50°C to 70°C)", 400));
        }
      }

      if (ambientHumidity !== undefined) {
        if (typeof ambientHumidity !== "number" || ambientHumidity < 0 || ambientHumidity > 100) {
          return next(new AppError("ambientHumidity out of plausible range (0% to 100%)", 400));
        }
      }

      // 5. Verify hive exists and is active in database
      const cleanHiveId = hiveId.trim();
      const cleanDeviceId = deviceId.trim();
      const hive = await Hive.findOne({ hiveId: cleanHiveId });

      if (!hive) {
        return next(new AppError(`Hive '${cleanHiveId}' not found in registry`, 404));
      }

      if (hive.status === "inactive" || hive.status === "collapsed") {
        return next(
          new AppError(
            `Cannot ingest telemetry for hive '${cleanHiveId}' with status '${hive.status}'`,
            400
          )
        );
      }

      // 6. Idempotency Check: Prevent duplicate insertions on network retries
      const existingReading = await SensorReading.findOne({
        deviceId: cleanDeviceId,
        timestamp: parsedTimestamp,
      });

      if (existingReading) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: "Telemetry reading already ingested for this device and timestamp",
          data: existingReading,
        });
      }

      // 7. Persist new SensorReading document
      const newReading = new SensorReading({
        hiveId: cleanHiveId,
        hive: hive._id,
        deviceId: cleanDeviceId,
        timestamp: parsedTimestamp,
        temperature,
        humidity,
        weightKg,
        flow,
        beeInCount,
        beeOutCount,
        soundFrequencyHz,
        acousticsDb,
        batteryLevelPct,
        ambientTemperature,
        ambientHumidity,
        metadata: {
          ...metadata,
          source: metadata.source || "device",
        },
      });

      await newReading.save();

      // 8. Update Hive document with latest telemetry health indicators & battery
      hive.currentHealthSummary = hive.currentHealthSummary || { status: "healthy" };
      hive.currentHealthSummary.latestReadingAt = parsedTimestamp;

      hive.deviceMetadata = hive.deviceMetadata || { deviceId: cleanDeviceId };
      hive.deviceMetadata.lastPingAt = new Date();
      hive.deviceMetadata.batteryLevelPct = batteryLevelPct;

      await hive.save();

      // 9. Automated Threshold Alert Monitoring (with sensible deduplication / cooldown)
      if (temperature < 32.0) {
        const severity = temperature < 30.0 ? "critical" : "warning";
        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId,
            apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity,
            alertType: "temperature_hypothermia",
            message: `Hive ${cleanHiveId} temperature dropped to ${temperature}°C, below optimal brood nest range (34°C - 36°C).`,
            metadata: { temperature, humidity },
            cooldownMinutes: 60,
          })
          .catch((e) => console.warn(`[IoTController] Could not record hypothermia alert: ${e.message}`));
      } else if (temperature > 37.5) {
        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId,
            apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical",
            alertType: "temperature_hyperthermia",
            message: `Hive ${cleanHiveId} temperature rose to ${temperature}°C, risking wax comb meltdown.`,
            metadata: { temperature, humidity },
            cooldownMinutes: 60,
          })
          .catch((e) => console.warn(`[IoTController] Could not record hyperthermia alert: ${e.message}`));
      }

      // Check rapid weight drop by comparing against the last preceding reading
      const previousReading = await SensorReading.findOne({
        hiveId: cleanHiveId,
        timestamp: { $lt: parsedTimestamp },
      }).sort({ timestamp: -1 });

      if (previousReading && (previousReading.weightKg - weightKg) > 1.5) {
        const weightLoss = Number((previousReading.weightKg - weightKg).toFixed(2));
        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId,
            apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical",
            alertType: "rapid_weight_loss",
            message: `Hive ${cleanHiveId} recorded a sudden weight drop of ${weightLoss} kg. Possible swarming or colony robbing event.`,
            metadata: { previousWeightKg: previousReading.weightKg, currentWeightKg: weightKg, weightLoss },
            cooldownMinutes: 120,
          })
          .catch((e) => console.warn(`[IoTController] Could not record weight loss alert: ${e.message}`));
      }

      if (batteryLevelPct < 15) {
        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId,
            apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "warning",
            alertType: "low_battery",
            message: `Edge gateway battery on hive ${cleanHiveId} is critically low (${batteryLevelPct}%).`,
            metadata: { batteryLevelPct, deviceId: cleanDeviceId },
            cooldownMinutes: 360,
          })
          .catch((e) => console.warn(`[IoTController] Could not record low battery alert: ${e.message}`));
      }

      return res.status(201).json({
        success: true,
        duplicate: false,
        message: "Telemetry reading ingested successfully",
        data: newReading,
      });
    } catch (err: any) {
      // Catch duplicate key error in race conditions
      if (err.code === 11000) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: "Telemetry reading already ingested",
        });
      }
      return next(err);
    }
  };

  /**
   * POST/GET /api/iot/simulate
   * Triggers an on-demand demo telemetry cycle for active hives directly within the database.
   * Preserves compatibility with the web dashboard "Trigger Live Telemetry Cycle" button
   * without requiring background loops or network loopbacks.
   */
  public triggerDemoCycle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const activeHives = await Hive.find({ status: "active" });
      if (activeHives.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No active hives found to simulate",
          data: { total: 0, successful: 0, results: [] },
        });
      }

      const results: any[] = [];
      const now = new Date();

      for (const hive of activeHives) {
        const deviceId = hive.deviceMetadata?.deviceId || `ESP32-${hive.hiveId}`;
        const temp = Number((34.5 + (Math.random() - 0.5) * 0.8).toFixed(2));
        const humidity = Number((58.0 + (Math.random() - 0.5) * 4.0).toFixed(1));
        const weightKg = Number((30.0 + Math.random() * 5.0).toFixed(3));
        const soundFrequencyHz = Math.round(210 + (Math.random() - 0.5) * 20);
        const acousticsDb = Number((60.0 + (Math.random() - 0.5) * 6.0).toFixed(1));
        const batteryLevelPct = Math.max(10, Math.min(100, Math.round(hive.deviceMetadata?.batteryLevelPct || 95) - Math.round(Math.random())));
        const diurnalFlow = Math.round(15 + Math.random() * 30);

        const newReading = new SensorReading({
          hiveId: hive.hiveId,
          hive: hive._id,
          deviceId,
          timestamp: now,
          temperature: temp,
          humidity,
          weightKg,
          flow: diurnalFlow,
          beeInCount: Math.round(30 + Math.random() * 20),
          beeOutCount: Math.round(25 + Math.random() * 15),
          soundFrequencyHz,
          acousticsDb,
          batteryLevelPct,
          ambientTemperature: Number((26.0 + (Math.random() - 0.5) * 4.0).toFixed(1)),
          ambientHumidity: Number((62.0 + (Math.random() - 0.5) * 6.0).toFixed(1)),
          metadata: {
            source: "demo-simulator",
            simulationCycle: 1,
            simulationVersion: "2.0",
          },
        });

        await newReading.save();

        hive.currentHealthSummary = hive.currentHealthSummary || { status: "healthy" };
        hive.currentHealthSummary.latestReadingAt = now;
        hive.deviceMetadata = hive.deviceMetadata || { deviceId };
        hive.deviceMetadata.lastPingAt = now;
        hive.deviceMetadata.batteryLevelPct = batteryLevelPct;
        await hive.save();

        results.push({
          hiveId: hive.hiveId,
          deviceId,
          temperature: temp,
          humidity,
          weightKg,
          success: true,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Simulation cycle completed: ${results.length}/${activeHives.length} readings ingested into MongoDB`,
        data: {
          total: activeHives.length,
          successful: results.length,
          results,
        },
      });
    } catch (err: any) {
      return next(err);
    }
  };

  /**
   * GET /api/iot/telemetry/:hiveId
   * Returns clean, chronological time-series sensor telemetry for a hive.
   * Supports from, to, limit, and resolution (raw | hourly) filters.
   */
  public getTelemetryHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hiveId = (Array.isArray(req.params.hiveId) ? req.params.hiveId[0] : req.params.hiveId) as string;
      if (!hiveId || !hiveId.trim()) {
        return next(new AppError("hiveId parameter is required", 400));
      }

      const cleanHiveId = hiveId.trim();
      const hive = await Hive.findOne({ hiveId: cleanHiveId });
      if (!hive) {
        return next(new AppError(`Hive '${cleanHiveId}' not found in registry`, 404));
      }

      const { from, to, limit, resolution } = req.query as any;

      const dateQuery: Record<string, any> = { hiveId: cleanHiveId };
      if (from || to) {
        dateQuery.timestamp = {};
        if (from) {
          const fromDate = new Date(from);
          if (!isNaN(fromDate.getTime())) dateQuery.timestamp.$gte = fromDate;
        }
        if (to) {
          const toDate = new Date(to);
          if (!isNaN(toDate.getTime())) dateQuery.timestamp.$lte = toDate;
        }
      }

      const maxLimit = Math.max(1, Math.min(1000, Number(limit) || 100));

      if (resolution === "hourly") {
        // Hourly aggregation
        const pipeline: any[] = [
          { $match: dateQuery },
          { $sort: { timestamp: 1 } },
          {
            $group: {
              _id: {
                year: { $year: "$timestamp" },
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" },
                hour: { $hour: "$timestamp" },
              },
              timestamp: { $first: "$timestamp" },
              temperature: { $avg: "$temperature" },
              humidity: { $avg: "$humidity" },
              weightKg: { $last: "$weightKg" },
              soundFrequencyHz: { $avg: "$soundFrequencyHz" },
              acousticsDb: { $avg: "$acousticsDb" },
              batteryLevelPct: { $last: "$batteryLevelPct" },
              flow: { $sum: "$flow" },
              beeInCount: { $sum: "$beeInCount" },
              beeOutCount: { $sum: "$beeOutCount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { timestamp: 1 } },
          { $limit: maxLimit },
        ];

        const aggregated = await SensorReading.aggregate(pipeline);
        const formatted = aggregated.map((item) => ({
          timestamp: item.timestamp,
          temperature: Number(item.temperature?.toFixed(2)),
          humidity: Number(item.humidity?.toFixed(1)),
          weightKg: Number(item.weightKg?.toFixed(3)),
          soundFrequencyHz: item.soundFrequencyHz ? Math.round(item.soundFrequencyHz) : undefined,
          acousticsDb: item.acousticsDb ? Number(item.acousticsDb.toFixed(1)) : undefined,
          batteryLevelPct: item.batteryLevelPct,
          flow: item.flow || 0,
          beeInCount: item.beeInCount || 0,
          beeOutCount: item.beeOutCount || 0,
        }));

        return res.status(200).json({
          success: true,
          hiveId: cleanHiveId,
          resolution: "hourly",
          count: formatted.length,
          data: formatted,
        });
      }

      // Raw telemetry readings
      const readings = await SensorReading.find(dateQuery)
        .sort({ timestamp: -1 })
        .limit(maxLimit)
        .lean();

      // Reverse so chronological earliest to latest
      readings.reverse();

      const formatted = readings.map((r) => ({
        id: r._id,
        timestamp: r.timestamp,
        temperature: r.temperature,
        humidity: r.humidity,
        weightKg: r.weightKg,
        soundFrequencyHz: r.soundFrequencyHz,
        acousticsDb: r.acousticsDb,
        batteryLevelPct: r.batteryLevelPct,
        flow: r.flow,
        beeInCount: r.beeInCount,
        beeOutCount: r.beeOutCount,
        ambientTemperature: r.ambientTemperature,
        ambientHumidity: r.ambientHumidity,
      }));

      return res.status(200).json({
        success: true,
        hiveId: cleanHiveId,
        resolution: "raw",
        count: formatted.length,
        data: formatted,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/iot/devices/:deviceId/status
   * Edge hardware gateway connectivity & diagnostic endpoint.
   */
  public getDeviceStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deviceId = (Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId) as string;
      if (!deviceId || !deviceId.trim()) {
        return next(new AppError("deviceId parameter is required", 400));
      }

      const cleanDeviceId = deviceId.trim();
      const [latestReading, linkedHive] = await Promise.all([
        SensorReading.findOne({ deviceId: cleanDeviceId }).sort({ timestamp: -1 }).lean(),
        Hive.findOne({ "deviceMetadata.deviceId": cleanDeviceId }).lean(),
      ]);

      if (!latestReading && !linkedHive) {
        return next(new AppError(`Device '${cleanDeviceId}' not found in registry or telemetry`, 404));
      }

      const lastPing = latestReading?.timestamp || linkedHive?.deviceMetadata?.lastPingAt;
      const isOnline = lastPing ? (Date.now() - new Date(lastPing).getTime()) < 30 * 60 * 1000 : false;

      return res.status(200).json({
        success: true,
        data: {
          deviceId: cleanDeviceId,
          hiveId: linkedHive?.hiveId || latestReading?.hiveId,
          isOnline,
          status: isOnline ? "online" : "offline",
          lastPingAt: lastPing,
          batteryLevelPct: latestReading?.batteryLevelPct ?? linkedHive?.deviceMetadata?.batteryLevelPct ?? null,
          hardwareModel: linkedHive?.deviceMetadata?.hardwareModel || "ESP32-WROOM-32U",
          firmwareVersion: linkedHive?.deviceMetadata?.firmwareVersion || "v1.0.0",
          latestReading: latestReading
            ? {
                timestamp: latestReading.timestamp,
                temperature: latestReading.temperature,
                humidity: latestReading.humidity,
                weightKg: latestReading.weightKg,
                batteryLevelPct: latestReading.batteryLevelPct,
              }
            : null,
        },
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const iotController = new IoTController();
export default iotController;
