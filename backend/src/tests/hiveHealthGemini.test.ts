import { expect } from "chai";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Apiary, Hive, SensorReading, AIPrediction } from "../models/index.js";
import { mlService } from "../services/ml.service.js";
import { weatherService } from "../services/weather.service.js";
import { geminiService } from "../services/gemini.service.js";
import { predictionTriggerService } from "../services/predictionTrigger.service.js";
import { populateHiveLocations } from "../scripts/populateHiveLocations.js";
import { HiveHealthScheduler } from "../services/hiveHealthScheduler.service.js";

describe("Hybrid Hive Health ML + Gemini AI Pipeline Test Suite", function () {
  this.timeout(30000);

  let mongoServer: MongoMemoryServer;
  let testApiaryId: mongoose.Types.ObjectId;
  const HIVE_48H_ID = "HIVE-48H-001";
  const HIVE_SPARSE_ID = "HIVE-SPARSE-002";
  const HIVE_LOCATIONLESS_ID = "HIVE-NOLOC-003";

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    // 1. Create test Apiary with coordinates
    const apiary = await Apiary.create({
      apiaryId: "APIARY-HYBRID-TEST",
      name: "Highland Valley Apiary",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      location: {
        latitude: 34.0837,
        longitude: 74.7973,
        region: "Kashmir Highlands",
        address: "Srinagar Valley, Kashmir, India",
        coordinates: { type: "Point", coordinates: [74.7973, 34.0837] },
      },
      floraType: ["Acacia", "Saffron"],
      capacity: 20,
      status: "active",
    });
    testApiaryId = apiary._id as mongoose.Types.ObjectId;

    // 2. Create Hive with explicit location
    await Hive.create({
      hiveId: HIVE_48H_ID,
      apiary: testApiaryId,
      apiaryId: "APIARY-HYBRID-TEST",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      hiveType: "Smart-IoT-Box",
      beeSpecies: "Apis mellifera",
      installationDate: new Date("2026-01-01"),
      status: "active",
      location: {
        latitude: 34.085,
        longitude: 74.8,
        address: "Apiary Plot A, Srinagar",
        isApproximate: false,
      },
      deviceMetadata: {
        deviceId: "ESP32-48H-01",
        batteryLevelPct: 90,
      },
      currentHealthSummary: {
        healthScore: 90,
        status: "healthy",
        stressIndex: 0.1,
      },
    });

    // 3. Create Hive with sparse data
    await Hive.create({
      hiveId: HIVE_SPARSE_ID,
      apiary: testApiaryId,
      apiaryId: "APIARY-HYBRID-TEST",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      hiveType: "Langstroth",
      beeSpecies: "Apis mellifera",
      installationDate: new Date("2026-01-01"),
      status: "active",
      location: {
        latitude: 34.085,
        longitude: 74.8,
        isApproximate: true,
      },
    });

    // 4. Create Hive without location (to test backfill)
    await Hive.create({
      hiveId: HIVE_LOCATIONLESS_ID,
      apiary: testApiaryId,
      apiaryId: "APIARY-HYBRID-TEST",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      hiveType: "Langstroth",
      beeSpecies: "Apis cerana indica",
      installationDate: new Date("2026-01-01"),
      status: "active",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("1. Hive Location & Backfill Script", () => {
    it("populateHiveLocations backfills missing hive location from parent apiary", async () => {
      const result = await populateHiveLocations();
      expect(result.updatedCount).to.be.at.least(1);

      const hive = await Hive.findOne({ hiveId: HIVE_LOCATIONLESS_ID }).lean();
      expect(hive?.location).to.exist;
      expect(hive?.location?.latitude).to.equal(34.0837);
      expect(hive?.location?.longitude).to.equal(74.7973);
      expect(hive?.location?.isApproximate).to.be.true;
    });

    it("does not overwrite explicit coordinates on existing hives", async () => {
      const hive = await Hive.findOne({ hiveId: HIVE_48H_ID }).lean();
      expect(hive?.location?.latitude).to.equal(34.085);
      expect(hive?.location?.isApproximate).to.be.false;
    });
  });

  describe("2. Weather Service Integration", () => {
    it("maps WMO weather interpretation codes accurately", () => {
      expect(weatherService.mapWmoCode(0)).to.equal("Clear Sky");
      expect(weatherService.mapWmoCode(3)).to.equal("Overcast");
      expect(weatherService.mapWmoCode(61)).to.equal("Rain");
      expect(weatherService.mapWmoCode(95)).to.equal("Thunderstorm");
    });

    it("rejects out-of-range coordinates gracefully without throwing", async () => {
      const invalid = await weatherService.getWeather(999, 999);
      expect(invalid).to.be.null;
    });

    it("fetches weather data or returns null without throwing errors", async () => {
      // Best-effort test against live Open-Meteo or graceful fallback
      const weather = await weatherService.getWeather(34.0837, 74.7973, 3000);
      if (weather) {
        expect(weather).to.have.property("temperature");
        expect(weather).to.have.property("humidity");
        expect(weather).to.have.property("condition");
      }
    });
  });

  describe("3. 48-Hour Rolling Window Sensor Summary & Gating", () => {
    it("computeSensorSummary calculates min, max, avg, latest, and trend", () => {
      const now = new Date();
      const readings = [];
      for (let i = 0; i < 48; i++) {
        const time = new Date(now.getTime() - (48 - i) * 3600 * 1000);
        readings.push({
          timestamp: time,
          temperature: 34.0 + (i > 30 ? 2.0 : 0.0), // rising trend
          humidity: 60.0 - (i > 30 ? 10.0 : 0.0), // falling trend
          weightKg: 40.0 + i * 0.05, // rising weight
          beeInCount: 15,
          beeOutCount: 12,
        });
      }

      const summary = mlService.computeSensorSummary(
        readings,
        readings[0].timestamp,
        readings[readings.length - 1].timestamp
      );

      expect(summary.sampleCount).to.equal(48);
      expect(summary.temperature.min).to.equal(34.0);
      expect(summary.temperature.max).to.equal(36.0);
      expect(summary.temperature.trend).to.equal("rising");
      expect(summary.humidity.trend).to.equal("falling");
      expect(summary.weight.netChangeKg).to.be.greaterThan(0);
      expect(summary.flow?.netFlow).to.be.greaterThan(0);
    });

    it("gating: rejects evaluation with INSUFFICIENT_TIME_WINDOW when span is < 46h and require48Hours is true", async () => {
      // Seed only 5 hours of telemetry for HIVE_SPARSE_ID
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        await SensorReading.create({
          readingId: `READING-SPARSE-${i}`,
          hiveId: HIVE_SPARSE_ID,
          deviceId: "DEV-SPARSE-01",
          timestamp: new Date(now.getTime() - (5 - i) * 3600 * 1000),
          temperature: 34.5,
          humidity: 60,
          weightKg: 42.0,
        });
      }

      const result = await mlService.predictForHive(HIVE_SPARSE_ID, {
        require48Hours: true,
      });

      expect(result.success).to.be.false;
      expect(result.status).to.equal("INSUFFICIENT_TIME_WINDOW");
      expect(result.message).to.include("At least 48 hours of sensor telemetry is required");
    });
  });

  describe("4. Trigger Layer & Cooldown Unit Evaluation", () => {
    const dummySummary = {
      sampleCount: 48,
      windowStart: new Date(Date.now() - 48 * 3600 * 1000),
      windowEnd: new Date(),
      temperature: { min: 34.2, max: 35.1, avg: 34.8, latest: 34.9, trend: "stable" as const },
      humidity: { min: 58, max: 65, avg: 61, latest: 60, trend: "stable" as const },
      weight: { min: 42.0, max: 42.5, avg: 42.2, latest: 42.3, trend: "stable" as const, netChangeKg: 0.3 },
    };

    it("does NOT trigger when hive health is normal and stable", () => {
      const evaluation = predictionTriggerService.evaluateTrigger(
        { healthScore: 92, status: "normal" },
        [{ timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 90, status: "normal" }],
        dummySummary
      );

      expect(evaluation.shouldTrigger).to.be.false;
    });

    it("triggers on CRITICAL_HEALTH condition (score <= 40)", () => {
      const evaluation = predictionTriggerService.evaluateTrigger(
        { healthScore: 35, status: "critical" },
        [{ timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 55, status: "warning" }],
        dummySummary
      );

      expect(evaluation.shouldTrigger).to.be.true;
      expect(evaluation.reason).to.include("CRITICAL_HEALTH");
      expect(evaluation.isCriticalEscalation).to.be.true;
    });

    it("triggers on STATE_TRANSITION from normal to warning", () => {
      const evaluation = predictionTriggerService.evaluateTrigger(
        { healthScore: 68, status: "warning" },
        [{ timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 88, status: "normal" }],
        dummySummary
      );

      expect(evaluation.shouldTrigger).to.be.true;
      expect(evaluation.reason).to.include("STATE_TRANSITION");
    });

    it("triggers on RAPID_HEALTH_DROP (hourly drop >= 10)", () => {
      const evaluation = predictionTriggerService.evaluateTrigger(
        { healthScore: 72, status: "normal" },
        [{ timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 84, status: "normal" }],
        dummySummary
      );

      expect(evaluation.shouldTrigger).to.be.true;
      expect(evaluation.reason).to.include("RAPID_HEALTH_DROP");
    });

    it("enforces 6-hour cooldown for non-critical repeated triggers", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);

      // Hourly drop of 13 points (78 -> 65) triggers RAPID_HEALTH_DROP (non-critical)
      const evaluation = predictionTriggerService.evaluateTrigger(
        { healthScore: 65, status: "warning" },
        [{ timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 78, status: "warning" }],
        dummySummary,
        twoHoursAgo // last triggered 2 hours ago (< 6h)
      );

      expect(evaluation.shouldTrigger).to.be.false;
      expect(evaluation.reason).to.include("SUPPRESSED_BY_COOLDOWN");
    });

    it("CRITICAL ESCALATION bypasses the 6-hour cooldown", () => {
      const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000);

      const evaluation = predictionTriggerService.evaluateTrigger(
        { healthScore: 30, status: "critical" },
        [{ timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 65, status: "warning" }],
        dummySummary,
        oneHourAgo // within cooldown window
      );

      expect(evaluation.shouldTrigger).to.be.true;
      expect(evaluation.isCriticalEscalation).to.be.true;
      expect(evaluation.reason).to.include("CRITICAL_ESCALATION_BYPASS_COOLDOWN");
    });
  });

  describe("5. Gemini Reasoning & Structured Decision Support", () => {
    it("generates structured apiculture decision support output without definitive diagnosis claims", async () => {
      const analysis = await geminiService.analyzeHiveHealth({
        hiveId: HIVE_48H_ID,
        triggerReason: "CRITICAL_HEALTH (Score: 35, Status: critical)",
        currentPrediction: {
          healthScore: 35,
          status: "critical",
          confidence: 0.9,
          tier: "T48",
          stressRisk: "HIGH",
          drivers: { temperatureDeviation: -3.2, netFlow: -15 },
        },
        predictionHistory: [
          { timestamp: new Date(Date.now() - 3600 * 1000), healthScore: 55, status: "warning" },
        ],
        sensorSummary: {
          sampleCount: 48,
          windowStart: new Date(Date.now() - 48 * 3600 * 1000),
          windowEnd: new Date(),
          temperature: { min: 29.5, max: 35.0, avg: 32.1, latest: 30.2, trend: "falling" },
          humidity: { min: 65, max: 88, avg: 74, latest: 82, trend: "rising" },
          weight: { min: 38.0, max: 41.5, avg: 40.0, latest: 38.2, trend: "falling", netChangeKg: -2.8 },
        },
      });

      expect(analysis).to.have.property("triggered", true);
      expect(analysis).to.have.property("summary");
      expect(analysis).to.have.property("possibleFactors");
      expect(analysis.possibleFactors).to.be.an("array");
      expect(analysis).to.have.property("recommendedAction");
      expect(analysis).to.have.property("urgency");
      expect(analysis).to.have.property("severity");
    });
  });

  describe("6. Automated Scheduler Deduplication", () => {
    it("HiveHealthScheduler skips hives that had a prediction within 50 minutes", async () => {
      const scheduler = new HiveHealthScheduler(60);

      // Create a recent prediction for HIVE_48H_ID 10 minutes ago
      await AIPrediction.create({
        predictionId: `PRED-RECENT-${Date.now()}`,
        targetType: "hive",
        hiveId: HIVE_48H_ID,
        predictionType: "colony_health",
        modelVersion: "1.0.0-hive-health-6tier",
        confidence: 0.9,
        predictionTimestamp: new Date(Date.now() - 10 * 60 * 1000),
        result: {
          status: "normal",
          healthScore: 92,
        },
        status: "active",
      });

      const { results } = await scheduler.runPipelineNow();
      const hiveResult = results.find((r) => r.hiveId === HIVE_48H_ID);

      expect(hiveResult).to.exist;
      expect(hiveResult?.skipped).to.be.true;
      expect(hiveResult?.reason).to.include("Prediction generated recently");
    });
  });
});
