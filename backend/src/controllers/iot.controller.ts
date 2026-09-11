import { Request, Response, NextFunction } from "express";
import { SensorReading, Hive } from "../models/index.js";
import alertService from "../services/alert.service.js";
import notificationService from "../services/notification.service.js";
import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";

function isInvalidNumber(val: any): boolean {
  return val === null || val === undefined || typeof val !== "number" || isNaN(val) || !isFinite(val);
}

export class IoTController {
  /**
   * In-memory cache tracking the epoch millisecond of the last persisted reading per hive/device.
   * Key: `${hiveId}:${deviceId}`
   */
  private lastPersistedMap = new Map<string, number>();

  /**
   * Resets the in-memory persistence cache (useful for automated test suite isolation).
   */
  public clearPersistenceCache(): void {
    this.lastPersistedMap.clear();
  }

  /**
   * POST /api/iot/telemetry
   * Ingests high-frequency IoT device telemetry (15–30s interval) from edge gateways.
   * Validates every sensor reading immediately, dispatches Twilio SMS alerts for abnormal readings,
   * and persists sampled readings to MongoDB at a minimum 10-minute interval per hive/device.
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

      // 1. Validate required core fields presence
      if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
        return next(new AppError("deviceId is required and must be a non-empty string", 400));
      }
      if (!hiveId || typeof hiveId !== "string" || !hiveId.trim()) {
        return next(new AppError("hiveId is required and must be a non-empty string", 400));
      }
      if (timestamp === undefined || timestamp === null) {
        return next(new AppError("timestamp is required (ISO 8601 string or Unix epoch ms)", 400));
      }

      // 2. Validate timestamp format and realistic clock drift threshold
      const parsedTimestamp = new Date(timestamp);
      if (isNaN(parsedTimestamp.getTime())) {
        return next(new AppError("Invalid timestamp format. Must be a valid date or epoch time", 400));
      }

      const nowMs = Date.now();
      // Disallow timestamps more than 10 minutes in the future
      if (parsedTimestamp.getTime() > nowMs + 10 * 60 * 1000) {
        return next(new AppError("Telemetry timestamp cannot be in the future beyond clock drift threshold", 400));
      }
      // Disallow corrupted timestamps older than year 2020
      if (parsedTimestamp.getTime() < new Date("2020-01-01").getTime()) {
        return next(new AppError("Telemetry timestamp is invalid or corrupted (pre-2020 epoch)", 400));
      }

      const cleanHiveId = hiveId.trim();
      const cleanDeviceId = deviceId.trim();

      // 3. Verify hive exists and is active in database
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

      // 4. Immediate Sensor Value Validation (NaN, Infinity, null, non-numeric, physical bounds)
      // Uses STATEFUL alerting — SMS fires on NEW abnormal, suppressed for CONTINUING conditions,
      // and re-enabled after recovery. markRecovery() is called when readings return to normal.

      const orgId: string | undefined = (hive as any).organizationId?.toString();

      // ── Temperature (-40°C to 70°C) ────────────────────────────────────────
      if (isInvalidNumber(temperature)) {
        await notificationService
          .sendAbnormalReadingAlert({
            hiveId: cleanHiveId, deviceId: cleanDeviceId,
            sensorName: "temperature",
            actualValue: String(temperature),
            expectedRange: "-40°C to 70°C",
            alertType: "abnormal_temperature",
            conditionDirection: "malformed",
            timestamp: parsedTimestamp,
            organizationId: orgId,
          })
          .catch((e) => console.warn(`[IoTController] Twilio alert failed: ${e.message}`));

        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId, apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical", alertType: "abnormal_temperature",
            message: `Hive ${cleanHiveId} received malformed/non-numeric temperature: ${temperature}.`,
            metadata: { temperature, deviceId: cleanDeviceId }, cooldownMinutes: 15,
          })
          .catch(() => {});

        return next(new AppError("temperature is required and must be a valid number", 400));
      }

      if (temperature < -40 || temperature > 70) {
        const dir = temperature > 70 ? "high" : "low";
        await notificationService
          .sendAbnormalReadingAlert({
            hiveId: cleanHiveId, deviceId: cleanDeviceId,
            sensorName: "temperature",
            actualValue: `${temperature}°C`,
            expectedRange: "-40°C to 70°C",
            alertType: "abnormal_temperature",
            conditionDirection: dir,
            timestamp: parsedTimestamp,
            organizationId: orgId,
          })
          .catch((e) => console.warn(`[IoTController] Twilio alert failed: ${e.message}`));

        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId, apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical", alertType: "abnormal_temperature",
            message: `Hive ${cleanHiveId} recorded abnormal temperature of ${temperature}°C, outside plausible sensor bounds (-40°C to 70°C).`,
            metadata: { temperature, deviceId: cleanDeviceId }, cooldownMinutes: 15,
          })
          .catch(() => {});

        return next(new AppError("temperature out of plausible range (-40°C to 70°C)", 400));
      }

      // Temperature is NORMAL — clear any active temperature alert state
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "temperature", alertType: "abnormal_temperature", conditionDirection: "high" }).catch(() => {});
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "temperature", alertType: "abnormal_temperature", conditionDirection: "low" }).catch(() => {});
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "temperature", alertType: "abnormal_temperature", conditionDirection: "malformed" }).catch(() => {});

      // ── Humidity (0% to 100%) ───────────────────────────────────────────────
      if (isInvalidNumber(humidity)) {
        await notificationService
          .sendAbnormalReadingAlert({
            hiveId: cleanHiveId, deviceId: cleanDeviceId,
            sensorName: "humidity",
            actualValue: String(humidity),
            expectedRange: "0% to 100%",
            alertType: "abnormal_humidity",
            conditionDirection: "malformed",
            timestamp: parsedTimestamp,
            organizationId: orgId,
          })
          .catch((e) => console.warn(`[IoTController] Twilio alert failed: ${e.message}`));

        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId, apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical", alertType: "abnormal_humidity",
            message: `Hive ${cleanHiveId} received malformed/non-numeric humidity: ${humidity}.`,
            metadata: { humidity, deviceId: cleanDeviceId }, cooldownMinutes: 15,
          })
          .catch(() => {});

        return next(new AppError("humidity is required and must be a valid number", 400));
      }

      if (humidity < 0 || humidity > 100) {
        const dir = humidity > 100 ? "high" : "low";
        await notificationService
          .sendAbnormalReadingAlert({
            hiveId: cleanHiveId, deviceId: cleanDeviceId,
            sensorName: "humidity",
            actualValue: `${humidity}%`,
            expectedRange: "0% to 100%",
            alertType: "abnormal_humidity",
            conditionDirection: dir,
            timestamp: parsedTimestamp,
            organizationId: orgId,
          })
          .catch((e) => console.warn(`[IoTController] Twilio alert failed: ${e.message}`));

        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId, apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical", alertType: "abnormal_humidity",
            message: `Hive ${cleanHiveId} recorded abnormal humidity of ${humidity}%, outside plausible bounds (0% to 100%).`,
            metadata: { humidity, deviceId: cleanDeviceId }, cooldownMinutes: 15,
          })
          .catch(() => {});

        return next(new AppError("humidity out of plausible range (0% to 100%)", 400));
      }

      // Humidity is NORMAL — clear active humidity alert state
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "humidity", alertType: "abnormal_humidity", conditionDirection: "high" }).catch(() => {});
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "humidity", alertType: "abnormal_humidity", conditionDirection: "low" }).catch(() => {});
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "humidity", alertType: "abnormal_humidity", conditionDirection: "malformed" }).catch(() => {});

      // ── Weight (0 kg to 300 kg) ─────────────────────────────────────────────
      if (isInvalidNumber(weightKg)) {
        await notificationService
          .sendAbnormalReadingAlert({
            hiveId: cleanHiveId, deviceId: cleanDeviceId,
            sensorName: "weight",
            actualValue: String(weightKg),
            expectedRange: "0kg to 300kg",
            alertType: "abnormal_weight",
            conditionDirection: "malformed",
            timestamp: parsedTimestamp,
            organizationId: orgId,
          })
          .catch((e) => console.warn(`[IoTController] Twilio alert failed: ${e.message}`));

        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId, apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical", alertType: "abnormal_weight",
            message: `Hive ${cleanHiveId} received malformed/non-numeric weightKg: ${weightKg}.`,
            metadata: { weightKg, deviceId: cleanDeviceId }, cooldownMinutes: 15,
          })
          .catch(() => {});

        return next(new AppError("weightKg is required and must be a valid number", 400));
      }

      if (weightKg < 0 || weightKg > 300) {
        const dir = weightKg > 300 ? "high" : "low";
        await notificationService
          .sendAbnormalReadingAlert({
            hiveId: cleanHiveId, deviceId: cleanDeviceId,
            sensorName: "weight",
            actualValue: `${weightKg}kg`,
            expectedRange: "0kg to 300kg",
            alertType: "abnormal_weight",
            conditionDirection: dir,
            timestamp: parsedTimestamp,
            organizationId: orgId,
          })
          .catch((e) => console.warn(`[IoTController] Twilio alert failed: ${e.message}`));

        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId, apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical", alertType: "abnormal_weight",
            message: `Hive ${cleanHiveId} recorded abnormal weight of ${weightKg} kg, outside plausible bounds (0 kg to 300 kg).`,
            metadata: { weightKg, deviceId: cleanDeviceId }, cooldownMinutes: 15,
          })
          .catch(() => {});

        return next(new AppError("weightKg out of plausible range (0 kg to 300 kg)", 400));
      }

      // Weight is NORMAL — clear active weight alert state
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "weight", alertType: "abnormal_weight", conditionDirection: "high" }).catch(() => {});
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "weight", alertType: "abnormal_weight", conditionDirection: "low" }).catch(() => {});
      await notificationService.markRecovery({ hiveId: cleanHiveId, deviceId: cleanDeviceId, sensorName: "weight", alertType: "abnormal_weight", conditionDirection: "malformed" }).catch(() => {});

      // Battery level check (0% to 100%)
      if (isInvalidNumber(batteryLevelPct)) {
        return next(new AppError("batteryLevelPct is required and must be a valid number", 400));
      }
      if (batteryLevelPct < 0 || batteryLevelPct > 100) {
        return next(new AppError("batteryLevelPct out of range (0% to 100%)", 400));
      }

      // Validate optional acoustic and environmental measurements
      if (soundFrequencyHz !== undefined) {
        if (typeof soundFrequencyHz !== "number" || isNaN(soundFrequencyHz) || soundFrequencyHz < 0 || soundFrequencyHz > 5000) {
          return next(new AppError("soundFrequencyHz must be a positive number between 0 and 5000 Hz", 400));
        }
      }

      if (acousticsDb !== undefined) {
        if (typeof acousticsDb !== "number" || isNaN(acousticsDb) || acousticsDb < 0 || acousticsDb > 140) {
          return next(new AppError("acousticsDb must be a positive number between 0 and 140 dB", 400));
        }
      }

      if (ambientTemperature !== undefined) {
        if (typeof ambientTemperature !== "number" || isNaN(ambientTemperature) || ambientTemperature < -50 || ambientTemperature > 70) {
          return next(new AppError("ambientTemperature out of plausible range (-50°C to 70°C)", 400));
        }
      }


      if (ambientHumidity !== undefined) {
        if (typeof ambientHumidity !== "number" || isNaN(ambientHumidity) || ambientHumidity < 0 || ambientHumidity > 100) {
          return next(new AppError("ambientHumidity out of plausible range (0% to 100%)", 400));
        }
      }

      // 5. Idempotency Check: Prevent duplicate insertions on exact network retries
      const existingReading = await SensorReading.findOne({
        deviceId: cleanDeviceId,
        timestamp: parsedTimestamp,
      });

      if (existingReading) {
        return res.status(200).json({
          success: true,
          persisted: true,
          duplicate: true,
          message: "Telemetry reading already ingested for this device and timestamp",
          data: existingReading,
        });
      }

      // 6. Downsampled Persistence Decision (Minimum 10-Minute Interval Per Hive/Device)
      const persistIntervalSec = env.TELEMETRY_PERSIST_INTERVAL_SECONDS || 600;
      const persistIntervalMs = persistIntervalSec * 1000;
      const hiveDeviceKey = `${cleanHiveId}:${cleanDeviceId}`;

      // In testing environments, if the DB collection was cleared, reset in-memory tracker
      if (process.env.NODE_ENV === "test") {
        const count = await SensorReading.countDocuments({ hiveId: cleanHiveId, deviceId: cleanDeviceId });
        if (count === 0 && this.lastPersistedMap.has(hiveDeviceKey)) {
          this.lastPersistedMap.delete(hiveDeviceKey);
        }
      }

      let lastPersistedMs = this.lastPersistedMap.get(hiveDeviceKey);
      if (lastPersistedMs === undefined) {
        // Cold-start fallback: query MongoDB for the most recent reading for this device/hive
        const latestDb = await SensorReading.findOne({
          hiveId: cleanHiveId,
          deviceId: cleanDeviceId,
        }).sort({ timestamp: -1 }).lean();

        if (latestDb && latestDb.timestamp) {
          lastPersistedMs = new Date(latestDb.timestamp).getTime();
          this.lastPersistedMap.set(hiveDeviceKey, lastPersistedMs);
        }
      }

      const currentReadingMs = parsedTimestamp.getTime();
      const shouldPersist = lastPersistedMs === undefined || (currentReadingMs - lastPersistedMs) >= persistIntervalMs;

      // 7. Biological Health & Threshold Alert Monitoring (Evaluated in real-time on EVERY reading)
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

      // Check sudden weight drop compared to last preceding recorded reading
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

      // 8. Case A: Persist to MongoDB when the 10-minute sampling interval has elapsed
      if (shouldPersist) {

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

        // Update in-memory tracker with persisted timestamp
        this.lastPersistedMap.set(hiveDeviceKey, currentReadingMs);

        // Update Hive summary
        hive.currentHealthSummary = hive.currentHealthSummary || { status: "healthy" };
        hive.currentHealthSummary.latestReadingAt = parsedTimestamp;
        hive.deviceMetadata = hive.deviceMetadata || { deviceId: cleanDeviceId };
        hive.deviceMetadata.lastPingAt = new Date();
        hive.deviceMetadata.batteryLevelPct = batteryLevelPct;
        await hive.save();

        return res.status(201).json({
          success: true,
          persisted: true,
          duplicate: false,
          message: "Telemetry reading ingested and persisted successfully",
          data: newReading,
        });
      }

      // 8. Case B: High-frequency reading within the 10-minute window (processed in memory, not stored)
      hive.deviceMetadata = hive.deviceMetadata || { deviceId: cleanDeviceId };
      hive.deviceMetadata.lastPingAt = new Date();
      hive.deviceMetadata.batteryLevelPct = batteryLevelPct;
      await hive.save();

      const inMemoryProcessed = {
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
      };

      return res.status(200).json({
        success: true,
        persisted: false,
        duplicate: false,
        message: "Telemetry reading processed in real-time (persistence skipped within 10-minute sampling window)",
        data: inMemoryProcessed,
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
   * Returns clean, chronological time-series sensor telemetry for a hive from MongoDB.
   * Note: MongoDB contains sampled telemetry persisted at >=10-minute intervals per hive/device,
   * while live edge gateways transmit at 15–30s high-frequency monitoring intervals.
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
