import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { Hive, Apiary, SensorReading } from "../models/index.js";
import {
  resolveTargetEndpoint,
  resolveIntervalMs,
  evolveDeviceState,
  sendTelemetry,
  startBackgroundSimulator,
  stopBackgroundSimulator,
} from "../scripts/simulateIoT.js";

describe("HoneyChain IoT Telemetry Ingestion & Simulator Test Suite", function () {
  this.timeout(20000);

  let mongoServer: MongoMemoryServer;
  let activeHive: any;
  let inactiveHive: any;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    await Promise.all([
      Apiary.init(),
      Hive.init(),
      SensorReading.init(),
    ]);

    // Create test apiary
    const apiary = await Apiary.create({
      apiaryId: "APIARY-IOT-TEST",
      name: "IoT Test Sanctuary",
      beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      location: { latitude: 22.57, longitude: 88.36, region: "Kolkata" },
    });

    // Create active hive
    activeHive = await Hive.create({
      hiveId: "HIVE-ACTIVE-001",
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      beekeeper: apiary.beekeeper,
      status: "active",
      deviceMetadata: {
        deviceId: "ESP32-UNIT-TEST-01",
        hardwareModel: "ESP32-S3",
        batteryLevelPct: 100,
      },
      currentHealthSummary: {
        healthScore: 95,
        status: "healthy",
      },
    });

    // Create inactive hive
    inactiveHive = await Hive.create({
      hiveId: "HIVE-INACTIVE-002",
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      beekeeper: apiary.beekeeper,
      status: "inactive",
    });
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    await SensorReading.deleteMany({});
  });

  describe("1. GET /health (Health & Status Endpoint)", function () {
    it("returns 200 OK with connected database status and no exposed secrets", async function () {
      const res = await request(app).get("/health");

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("ok");
      expect(res.body.database.status).to.equal("connected");
      expect(res.body.timestamp).to.exist;
      expect(res.body.uptimeSeconds).to.be.a("number");

      // Verify no sensitive keys, credentials or URIs are leaked
      const stringified = JSON.stringify(res.body);
      expect(stringified).to.not.include("mongodb");
      expect(stringified).to.not.include("password");
      expect(stringified).to.not.include("privateKey");
    });
  });

  describe("2. POST /api/iot/telemetry (Strict Validation & Ingestion)", function () {
    it("successfully ingests valid telemetry and updates Hive health summary", async function () {
      const payload = {
        deviceId: "ESP32-UNIT-TEST-01",
        hiveId: "HIVE-ACTIVE-001",
        timestamp: new Date().toISOString(),
        temperature: 34.8,
        humidity: 58.4,
        weightKg: 32.15,
        soundFrequencyHz: 218,
        acousticsDb: 62.5,
        batteryLevelPct: 94,
        ambientTemperature: 28.2,
        ambientHumidity: 65.0,
        metadata: {
          rssi: -82,
          snr: 9.1,
          source: "simulator",
          simulationVersion: "1.0",
        },
      };

      const res = await request(app)
        .post("/api/iot/telemetry")
        .send(payload);

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.duplicate).to.be.false;
      expect(res.body.data.temperature).to.equal(34.8);
      expect(res.body.data.metadata.source).to.equal("simulator");

      // Verify MongoDB persistence
      const saved = await SensorReading.findOne({ deviceId: "ESP32-UNIT-TEST-01" });
      expect(saved).to.not.be.null;
      expect(saved?.weightKg).to.equal(32.15);
      expect(saved?.hive?.toString()).to.equal(activeHive._id.toString());

      // Verify Hive document was updated with latest reading time and battery
      const updatedHive = await Hive.findById(activeHive._id);
      expect(updatedHive?.currentHealthSummary?.latestReadingAt).to.exist;
      expect(updatedHive?.deviceMetadata?.batteryLevelPct).to.equal(94);
    });

    it("rejects telemetry with missing required fields (deviceId, hiveId, timestamp)", async function () {
      const resMissingDevice = await request(app)
        .post("/api/iot/telemetry")
        .send({
          hiveId: "HIVE-ACTIVE-001",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });

      expect(resMissingDevice.status).to.equal(400);
      expect(resMissingDevice.body.error.message).to.include("deviceId is required");

      const resMissingHive = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });

      expect(resMissingHive.status).to.equal(400);
      expect(resMissingHive.body.error.message).to.include("hiveId is required");
    });

    it("rejects telemetry with impossible physical sensor values", async function () {
      // Impossible temperature > 70C
      const resTemp = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-ACTIVE-001",
          timestamp: new Date().toISOString(),
          temperature: 150.0, // Invalid
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });
      expect(resTemp.status).to.equal(400);
      expect(resTemp.body.error.message).to.include("temperature out of plausible range");

      // Impossible humidity > 100%
      const resHum = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-ACTIVE-001",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 105.0, // Invalid
          weightKg: 30.0,
          batteryLevelPct: 90,
        });
      expect(resHum.status).to.equal(400);
      expect(resHum.body.error.message).to.include("humidity out of plausible range");

      // Negative weight
      const resWeight = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-ACTIVE-001",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 58.0,
          weightKg: -5.0, // Invalid
          batteryLevelPct: 90,
        });
      expect(resWeight.status).to.equal(400);
      expect(resWeight.body.error.message).to.include("weightKg out of plausible range");

      // Impossible battery > 100%
      const resBatt = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-ACTIVE-001",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 120, // Invalid
        });
      expect(resBatt.status).to.equal(400);
      expect(resBatt.body.error.message).to.include("batteryLevelPct out of range");
    });

    it("rejects malformed or future timestamps beyond clock drift limits", async function () {
      const resMalformed = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-ACTIVE-001",
          timestamp: "not-a-valid-date",
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });
      expect(resMalformed.status).to.equal(400);
      expect(resMalformed.body.error.message).to.include("Invalid timestamp format");

      const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const resFuture = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-ACTIVE-001",
          timestamp: futureDate,
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });
      expect(resFuture.status).to.equal(400);
      expect(resFuture.body.error.message).to.include("cannot be in the future");
    });

    it("rejects telemetry for unknown or inactive hives", async function () {
      const resUnknown = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-NON-EXISTENT",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });
      expect(resUnknown.status).to.equal(404);
      expect(resUnknown.body.error.message).to.include("not found in registry");

      const resInactive = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-UNIT-TEST-01",
          hiveId: "HIVE-INACTIVE-002",
          timestamp: new Date().toISOString(),
          temperature: 34.5,
          humidity: 58.0,
          weightKg: 30.0,
          batteryLevelPct: 90,
        });
      expect(resInactive.status).to.equal(400);
      expect(resInactive.body.error.message).to.include("Cannot ingest telemetry for hive");
    });
  });

  describe("3. Idempotency & Deduplication", function () {
    it("safely handles duplicate telemetry without creating duplicate MongoDB records", async function () {
      const fixedTimestamp = new Date(Date.now() - 60000).toISOString();
      const payload = {
        deviceId: "ESP32-DEDUP-01",
        hiveId: "HIVE-ACTIVE-001",
        timestamp: fixedTimestamp,
        temperature: 34.7,
        humidity: 57.8,
        weightKg: 31.0,
        batteryLevelPct: 95,
      };

      // First submission: creates document
      const res1 = await request(app).post("/api/iot/telemetry").send(payload);
      expect(res1.status).to.equal(201);
      expect(res1.body.duplicate).to.be.false;

      // Second identical submission: returns duplicate=true without error
      const res2 = await request(app).post("/api/iot/telemetry").send(payload);
      expect(res2.status).to.equal(200);
      expect(res2.body.duplicate).to.be.true;
      expect(res2.body.message).to.include("already ingested");

      // Verify only ONE document exists in MongoDB
      const count = await SensorReading.countDocuments({
        deviceId: "ESP32-DEDUP-01",
      });
      expect(count).to.equal(1);
    });
  });

  describe("4. Simulator Architecture & Utility Logic", function () {
    it("resolveTargetEndpoint formats API endpoint and rejects missing URL", function () {
      expect(() => resolveTargetEndpoint(undefined)).to.throw(
        "Missing required environment variable: IOT_TARGET_URL"
      );
      expect(() => resolveTargetEndpoint("")).to.throw(
        "Missing required environment variable: IOT_TARGET_URL"
      );

      const endpoint1 = resolveTargetEndpoint("https://honeychain-api.onrender.com");
      expect(endpoint1).to.equal("https://honeychain-api.onrender.com/api/iot/telemetry");

      // Strips trailing slashes correctly
      const endpoint2 = resolveTargetEndpoint("https://honeychain-api.onrender.com///");
      expect(endpoint2).to.equal("https://honeychain-api.onrender.com/api/iot/telemetry");
    });

    it("resolveIntervalMs parses custom intervals and falls back to default", function () {
      expect(resolveIntervalMs("15000")).to.equal(15000);
      expect(resolveIntervalMs("10000")).to.equal(10000);
      // Fallback on missing or invalid
      expect(resolveIntervalMs(undefined)).to.equal(600000); // 10 minutes
      expect(resolveIntervalMs("invalid")).to.equal(600000);
    });

    it("evolveDeviceState produces realistic stateful values within bounds", function () {
      const state = {
        hiveId: "HIVE-SB-101",
        deviceId: "ESP32-SB-GW-01",
        temp: 34.8,
        humidity: 58.2,
        weightKg: 31.45,
        batteryPct: 96.5,
        baseFrequencyHz: 215,
        cycleCount: 0,
      };

      const payload = evolveDeviceState(state);
      expect(payload.hiveId).to.equal("HIVE-SB-101");
      expect(payload.deviceId).to.equal("ESP32-SB-GW-01");
      expect(payload.temperature).to.be.within(33.0, 37.0);
      expect(payload.humidity).to.be.within(45.0, 75.0);
      expect(payload.weightKg).to.be.within(25.0, 45.0);
      expect(payload.batteryLevelPct).to.be.within(1, 100);
      expect(payload.metadata.source).to.equal("simulator");
      expect(payload.metadata.simulationVersion).to.equal("1.0");
      expect(state.cycleCount).to.equal(1);
    });

    it("sendTelemetry handles successful transmission and HTTP errors gracefully", async function () {
      // Mock global fetch for unit test
      const originalFetch = global.fetch;

      try {
        // Test Success
        global.fetch = async () =>
          new Response(JSON.stringify({ success: true, duplicate: false }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });

        const successRes = await sendTelemetry("http://fake-target/api/iot/telemetry", { test: true });
        expect(successRes.success).to.be.true;
        expect(successRes.status).to.equal(201);

        // Test HTTP 400 Failure without crashing
        global.fetch = async () =>
          new Response(JSON.stringify({ error: { message: "Invalid sensor reading" } }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });

        const failRes = await sendTelemetry("http://fake-target/api/iot/telemetry", { test: true });
        expect(failRes.success).to.be.false;
        expect(failRes.status).to.equal(400);
        expect(failRes.message).to.equal("Invalid sensor reading");

        // Test Network Exception without crashing
        global.fetch = async () => {
          throw new Error("ECONNREFUSED - Server offline");
        };

        const netRes = await sendTelemetry("http://fake-target/api/iot/telemetry", { test: true });
        expect(netRes.success).to.be.false;
        expect(netRes.message).to.include("ECONNREFUSED");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("startBackgroundSimulator stays idle and returns false when IOT_TARGET_URL is unset", function () {
      const started = startBackgroundSimulator("", 60000);
      expect(started).to.be.false;
      stopBackgroundSimulator();
    });

    it("startBackgroundSimulator activates and stops cleanly when IOT_TARGET_URL is provided", function () {
      const started = startBackgroundSimulator("http://localhost:5000", 60000);
      expect(started).to.be.true;

      // Starting again returns true without recreating
      const secondCall = startBackgroundSimulator("http://localhost:5000", 60000);
      expect(secondCall).to.be.true;

      // Clean shutdown
      stopBackgroundSimulator();
    });
  });
});

