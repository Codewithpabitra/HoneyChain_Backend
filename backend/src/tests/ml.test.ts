import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { mlService, MLService } from "../services/ml.service.js";
import { Apiary, Hive, SensorReading, AIPrediction } from "../models/index.js";

describe("HoneyChain Hive Health ML Inference Test Suite", function () {
  this.timeout(30000);

  let mongoServer: MongoMemoryServer;
  let testApiaryId: mongoose.Types.ObjectId;
  let testHiveId: mongoose.Types.ObjectId;
  const HIVE_ID = "HIVE-TEST-001";
  const TEST_DEVICE_ID = "DEV-TEST-001";

  before(async () => {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    // 3. Seed test Apiary and Hive
    const apiary = await Apiary.create({
      apiaryId: "APIARY-ML-TEST",
      name: "ML Testing Apiary",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      location: {
        latitude: 34.0837,
        longitude: 74.7973,
        region: "Kashmir Valley Highlands",
        address: "Srinagar, Jammu & Kashmir",
      },
      floraType: ["Acacia", "Saffron"],
      capacity: 10,
      status: "active",
    });
    testApiaryId = apiary._id as mongoose.Types.ObjectId;

    const hive = await Hive.create({
      hiveId: HIVE_ID,
      apiary: testApiaryId,
      apiaryId: "APIARY-ML-TEST",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      hiveType: "Langstroth",
      beeSpecies: "Apis mellifera",
      installationDate: new Date("2026-01-01"),
      status: "active",
      deviceMetadata: {
        deviceId: TEST_DEVICE_ID,
        batteryLevelPct: 95,
      },
    });
    testHiveId = hive._id as mongoose.Types.ObjectId;
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("1. Feature Engineering & Contract Transformation Unit Tests", () => {
    it("formatLocalHiveTime converts UTC Date to local IST (+05:30) YYYY-MM-DD HH:mm:ss", () => {
      // 2026-05-10 06:30:00 UTC = 2026-05-10 12:00:00 IST (+330 min)
      const utcDate = new Date("2026-05-10T06:30:00.000Z");
      const localStr = mlService.formatLocalHiveTime(utcDate, 330);
      expect(localStr).to.equal("2026-05-10 12:00:00");
    });

    it("prepareModelInput maps ambientTemperature and falls back to in-hive temperature", () => {
      const readings = [
        {
          timestamp: new Date("2026-05-10T06:30:00.000Z"),
          temperature: 34.5, // brood nest
          ambientTemperature: 24.2, // ambient air
          humidity: 55.0,
          ambientHumidity: 65.0,
          weightKg: 38.5,
          flow: 15,
        },
        {
          timestamp: new Date("2026-05-10T07:30:00.000Z"),
          temperature: 35.0, // brood nest
          ambientTemperature: undefined, // missing ambient -> fallback to in-hive
          humidity: 56.0,
          ambientHumidity: undefined, // fallback to in-hive
          weightKg: 38.7,
          flow: 20,
        },
      ];

      const modelInput = mlService.prepareModelInput(readings, 330);
      expect(modelInput).to.have.lengthOf(2);

      // First reading uses ambient
      expect(modelInput[0].temperature).to.equal(24.2);
      expect(modelInput[0].humidity).to.equal(65.0);
      expect(modelInput[0].weight).to.equal(38.5);
      expect(modelInput[0].flow).to.equal(15);

      // Second reading falls back to in-hive
      expect(modelInput[1].temperature).to.equal(35.0);
      expect(modelInput[1].humidity).to.equal(56.0);
      expect(modelInput[1].weight).to.equal(38.7);
      expect(modelInput[1].flow).to.equal(20);
    });

    it("prepareModelInput computes signed flow from beeInCount and beeOutCount (never averages)", () => {
      const readings = [
        {
          timestamp: new Date("2026-05-10T08:00:00.000Z"),
          temperature: 25.0,
          humidity: 60.0,
          weightKg: 35.0,
          beeInCount: 120,
          beeOutCount: 45, // net flow = +75
        },
        {
          timestamp: new Date("2026-05-10T09:00:00.000Z"),
          temperature: 26.0,
          humidity: 58.0,
          weightKg: 34.8,
          beeInCount: 30,
          beeOutCount: 110, // net flow = -80
        },
      ];

      const modelInput = mlService.prepareModelInput(readings, 330);
      expect(modelInput[0].flow).to.equal(75);
      expect(modelInput[1].flow).to.equal(-80);
    });

    it("prepareModelInput gracefully handles metadata flow and missing values with 'nan'", () => {
      const readings = [
        {
          timestamp: new Date("2026-05-10T10:00:00.000Z"),
          temperature: NaN,
          humidity: NaN,
          weightKg: 32.0,
          metadata: { netFlow: -12 },
        },
      ];

      const modelInput = mlService.prepareModelInput(readings, 330);
      expect(modelInput[0].temperature).to.equal("nan");
      expect(modelInput[0].humidity).to.equal("nan");
      expect(modelInput[0].flow).to.equal(-12);
    });
  });

  describe("2. ML Error Handling & Insufficient Telemetry", () => {
    it("throws 404 for unknown hiveId in predictForHive", async () => {
      try {
        await mlService.predictForHive("NON-EXISTENT-HIVE");
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include("not found in registry");
      }
    });

    it("returns INSUFFICIENT_DATA when hive has zero sensor readings", async () => {
      const result = await mlService.predictForHive(HIVE_ID);
      expect(result.success).to.be.false;
      expect(result.status).to.equal("INSUFFICIENT_DATA");
      expect(result.message).to.include("At least 1 reading is required");
    });
  });

  describe("3. Real Model Inference, Tier Selection & Persistence", () => {
    before(async () => {
      // Seed 25 hourly readings for HIVE_ID to trigger T24 classifier
      const baseDate = new Date("2026-05-10T00:00:00.000Z");
      const sampleReadings = [];

      for (let i = 0; i < 25; i++) {
        const readingDate = new Date(baseDate.getTime() + i * 3600000);
        sampleReadings.push({
          hiveId: HIVE_ID,
          hive: testHiveId,
          deviceId: TEST_DEVICE_ID,
          timestamp: readingDate,
          temperature: 34.5 + Math.sin(i / 3) * 0.5,
          ambientTemperature: 22.0 + Math.sin(i / 4) * 5,
          humidity: 58.0 + Math.cos(i / 3) * 3,
          ambientHumidity: 65.0 - Math.cos(i / 4) * 8,
          weightKg: 36.5 + i * 0.02,
          flow: Math.round(Math.sin(i / 3) * 40),
          soundFrequencyHz: 215,
          acousticsDb: 60.5,
          batteryLevelPct: 95,
        });
      }

      await SensorReading.insertMany(sampleReadings);
    });

    it("runs end-to-end inference and returns real tier, healthScore, and drivers", async () => {
      const health = await mlService.checkHealth();
      if (!health.healthy) {
        console.warn("Skipping real model inference: Python service is not running.");
        return;
      }

      const result = await mlService.predictForHive(HIVE_ID, { persist: true });

      expect(result.success).to.be.true;
      expect(result.status).to.equal("OK");
      expect(result.modelOutput).to.be.an("object");
      expect(result.modelOutput.tier).to.be.oneOf(["T1", "T6", "T12", "T24", "T36", "T48"]);
      expect(result.modelOutput.healthScore).to.be.a("number").within(0, 100);
      expect(result.modelOutput.stressRisk).to.be.oneOf(["LOW", "MEDIUM", "HIGH"]);
      expect(result.modelOutput.drivers).to.be.an("object");
      expect(result.modelOutput.drivers).to.have.property("activityDeviation");
      expect(result.modelOutput.drivers).to.have.property("temperatureDeviation");
      expect(result.modelOutput.drivers).to.have.property("netFlow");
      expect(result.modelOutput.recommendation).to.be.a("string");

      // Verify persistence in MongoDB AIPrediction
      expect(result.prediction).to.not.be.null;
      const storedPred = await AIPrediction.findOne({ predictionId: result.prediction.predictionId });
      expect(storedPred).to.not.be.null;
      expect(storedPred!.hiveId).to.equal(HIVE_ID);
      expect(storedPred!.result.healthScore).to.equal(result.modelOutput.healthScore);
      expect(storedPred!.result.tier).to.equal(result.modelOutput.tier);
      expect(storedPred!.result.stressRisk).to.equal(result.modelOutput.stressRisk);

      // Verify Hive.currentHealthSummary was updated
      const updatedHive = await Hive.findOne({ hiveId: HIVE_ID });
      expect(updatedHive!.currentHealthSummary?.healthScore).to.equal(result.modelOutput.healthScore);
      expect(updatedHive!.currentHealthSummary?.lastAIPredictionId).to.equal(result.prediction.predictionId);
    });
  });

  describe("4. API Endpoints Integration Tests", () => {
    it("GET /api/ml/health returns microservice health status", async () => {
      const res = await request(app).get("/api/ml/health");
      expect(res.status).to.be.oneOf([200, 503]);
      expect(res.body).to.have.property("data");
    });

    it("POST /api/ml/predict/:hiveId returns prediction or insufficient data for empty hive", async () => {
      const emptyHive = await Hive.create({
        hiveId: "HIVE-EMPTY-999",
        apiary: testApiaryId,
        apiaryId: "APIARY-ML-TEST",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        hiveType: "Langstroth",
        beeSpecies: "Apis cerana",
        installationDate: new Date(),
        status: "active",
      });

      const res = await request(app).post(`/api/ml/predict/${emptyHive.hiveId}`);
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.false;
      expect(res.body.status).to.equal("INSUFFICIENT_DATA");
    });

    it("POST /api/ml/predict/:hiveId rejects invalid or unknown hiveId with 404", async () => {
      const res = await request(app).post("/api/ml/predict/NONEXISTENT");
      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
    });

    it("GET /api/ml/predictions/:hiveId retrieves paginated historical predictions", async () => {
      const res = await request(app).get(`/api/ml/predictions/${HIVE_ID}?limit=10&page=1`);
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property("predictions");
      expect(res.body.data).to.have.property("total");
    });

    it("GET /api/ml/latest/:hiveId returns the latest prediction", async () => {
      const res = await request(app).get(`/api/ml/latest/${HIVE_ID}`);
      expect(res.status).to.be.oneOf([200, 404]);
      if (res.status === 200) {
        expect(res.body.success).to.be.true;
        expect(res.body.data.hiveId).to.equal(HIVE_ID);
      }
    });

    it("GET /api/ml/latest/:hiveId returns 404 if no prediction has been generated yet", async () => {
      const res = await request(app).get("/api/ml/latest/HIVE-EMPTY-999");
      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.status).to.equal("NOT_FOUND");
    });
  });

  describe("5. Decoupled HTTP Client Resilience & Security Tests", () => {
    it("handles unreachable ML microservice host gracefully without throwing", async () => {
      const disconnectedService = new MLService();
      // Point to an inactive port
      (disconnectedService as any).serviceUrl = "http://127.0.0.1:59999";
      (disconnectedService as any).timeoutMs = 500;

      const health = await disconnectedService.checkHealth();
      expect(health.healthy).to.be.false;
      expect(health.modelLoaded).to.be.false;
      expect(health.serviceUrl).to.equal("http://127.0.0.1:59999");
      expect(health.error).to.be.a("string");
    });

    it("returns SERVICE_UNAVAILABLE when microservice is offline and does not crash Express", async () => {
      const offlineService = new MLService();
      (offlineService as any).serviceUrl = "http://127.0.0.1:59999";
      (offlineService as any).timeoutMs = 500;

      const result = await offlineService.predictForHive(HIVE_ID);
      expect(result.success).to.be.false;
      expect(result.status).to.be.oneOf(["SERVICE_UNAVAILABLE", "SERVICE_TIMEOUT"]);
      expect(result.message).to.be.a("string");
    });

    it("attaches X-ML-API-Key header when ML_API_KEY is configured", async () => {
      const securedService = new MLService();
      (securedService as any).apiKey = "secure-demo-key-xyz";

      const headers = (securedService as any).getHeaders({ "Content-Type": "application/json" });
      expect(headers).to.have.property("X-ML-API-Key", "secure-demo-key-xyz");
      expect(headers).to.have.property("Content-Type", "application/json");
    });
  });
});
