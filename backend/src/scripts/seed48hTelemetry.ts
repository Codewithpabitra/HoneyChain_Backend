// backend/src/scripts/seed48hTelemetry.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { Hive, SensorReading } from "../models/index.js";
import { mlService } from "../services/ml.service.js";

interface HiveConfig {
  baseTemp: number;
  baseWeight: number;
  baseHz: number;
}

const DEFAULT_CONFIGS: Record<string, HiveConfig> = {
  "HIVE-SB-101": { baseTemp: 34.8, baseWeight: 31.5, baseHz: 215 },
  "HIVE-SB-102": { baseTemp: 34.4, baseWeight: 28.5, baseHz: 205 },
  "HIVE-KV-201": { baseTemp: 33.9, baseWeight: 35.8, baseHz: 238 },
  "HIVE-WG-301": { baseTemp: 35.1, baseWeight: 29.4, baseHz: 210 },
};

export async function seed48hTelemetryIfNeeded(force = false): Promise<void> {
  const hives = await Hive.find({ status: "active" });
  if (hives.length === 0) {
    console.log("[Seed48h] No active hives found to seed.");
    return;
  }

  const nowMs = Date.now();
  const fortyEightHoursAgo = new Date(nowMs - 48 * 3600 * 1000);

  for (const hive of hives) {
    const hiveId = hive.hiveId;
    const existingCount = await SensorReading.countDocuments({
      hiveId,
      timestamp: { $gte: fortyEightHoursAgo },
    });

    const latestReading = await SensorReading.findOne({ hiveId }).sort({ timestamp: -1 }).lean();
    const latestAgeHours = latestReading
      ? (nowMs - new Date(latestReading.timestamp).getTime()) / (3600 * 1000)
      : 999;

    // Seed if forced, or if hive has fewer than 24 readings in past 48h, or if latest reading is > 4h stale
    if (force || existingCount < 24 || latestAgeHours > 4) {
      console.log(`[Seed48h] Seeding 48-hour continuous rolling telemetry for ${hiveId} (existingCount=${existingCount}, latestAge=${latestAgeHours.toFixed(1)}h)...`);

      const config = DEFAULT_CONFIGS[hiveId] || { baseTemp: 34.6, baseWeight: 32.0, baseHz: 220 };
      const deviceId = hive.deviceMetadata?.deviceId || `ESP32-${hiveId}`;
      const readingsToInsert: any[] = [];

      // Generate 49 hourly points from 48h ago up to current minute
      for (let hour = 48; hour >= 0; hour--) {
        const timestamp = new Date(nowMs - hour * 3600 * 1000);
        const hourOfDay = timestamp.getHours();

        // Diurnal thermal cycle (brood regulated ~34.2-35.4°C)
        const diurnalTempCycle = Math.sin(((hourOfDay - 8) * Math.PI) / 12) * 0.45;
        const internalTemp = Number((config.baseTemp + diurnalTempCycle + (Math.random() * 0.15 - 0.07)).toFixed(2));
        const internalHumidity = Number((58.5 - diurnalTempCycle * 2.0 + (Math.random() * 1.5 - 0.7)).toFixed(1));

        // Hive weight: morning nectar foraging gain (+0.03 kg/h), night consumption (-0.01 kg/h)
        const weightProgression = (48 - hour) * 0.015;
        const currentWeight = Number((config.baseWeight + weightProgression + (Math.random() * 0.04 - 0.02)).toFixed(3));

        // Bee foraging traffic: high during 7am - 6pm, quiet at night
        const isDaytime = hourOfDay >= 7 && hourOfDay <= 18;
        const beeIn = isDaytime ? Math.round(30 + Math.sin(((hourOfDay - 7) * Math.PI) / 11) * 60 + Math.random() * 15) : Math.round(Math.random() * 3);
        const beeOut = isDaytime ? Math.round(28 + Math.sin(((hourOfDay - 7) * Math.PI) / 11) * 58 + Math.random() * 15) : Math.round(Math.random() * 3);
        const flow = beeIn - beeOut;

        const ambientTemp = Number((24.0 + Math.sin(((hourOfDay - 8) * Math.PI) / 12) * 5.0 + (Math.random() * 0.4)).toFixed(1));
        const ambientHum = Number((68.0 - Math.sin(((hourOfDay - 8) * Math.PI) / 12) * 10.0 + (Math.random() * 1.5)).toFixed(1));

        readingsToInsert.push({
          hiveId,
          hive: hive._id,
          deviceId,
          timestamp,
          temperature: internalTemp,
          humidity: internalHumidity,
          weightKg: currentWeight,
          flow,
          beeInCount: beeIn,
          beeOutCount: beeOut,
          soundFrequencyHz: Math.round(config.baseHz + (Math.random() * 6 - 3)),
          acousticsDb: Number((58.0 + (Math.random() * 4.0)).toFixed(1)),
          batteryLevelPct: Math.round(98 - hour * 0.04),
          ambientTemperature: ambientTemp,
          ambientHumidity: ambientHum,
          metadata: {
            seeded: true,
            rollingWindowSpanHours: 48,
          },
        });
      }

      // Remove any stale seeded readings for this hive to keep dataset tidy
      await SensorReading.deleteMany({
        hiveId,
        "metadata.seeded": true,
      });

      await SensorReading.insertMany(readingsToInsert);
      console.log(`  + Inserted ${readingsToInsert.length} telemetry readings for ${hiveId} spanning 48 hours.`);

      // Execute AI health prediction & decision support immediately
      try {
        console.log(`  + Running initial hybrid ML + Gemini AI analysis for ${hiveId}...`);
        const predResult = await mlService.predictForHive(hiveId, {
          persist: true,
          forceAi: true,
        });
        console.log(`  + Analysis completed for ${hiveId}: status=${predResult.status}, geminiTriggered=${predResult.geminiAnalysis?.triggered ?? false}`);
      } catch (predErr: any) {
        console.warn(`  - Initial prediction warning for ${hiveId}:`, predErr.message);
      }
    } else {
      console.log(`[Seed48h] Hive ${hiveId} already has ${existingCount} readings in past 48h (latest reading is ${latestAgeHours.toFixed(1)}h old).`);
    }
  }
}

// Allow direct execution from CLI
if (process.argv[1]?.endsWith("seed48hTelemetry.ts") || process.argv[1]?.endsWith("seed48hTelemetry.js")) {
  connectDB()
    .then(async () => {
      const forceFlag = process.argv.includes("--force");
      await seed48hTelemetryIfNeeded(forceFlag);
      await mongoose.disconnect();
      console.log("[Seed48h] Finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Seed48h] Fatal error:", err);
      process.exit(1);
    });
}
