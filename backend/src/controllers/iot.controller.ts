import { Request, Response, NextFunction } from "express";
import { SensorReading, Hive } from "../models/index.js";
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
}

export const iotController = new IoTController();
export default iotController;
