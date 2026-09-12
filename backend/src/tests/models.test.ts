import { expect } from "chai";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  Apiary,
  Hive,
  SensorReading,
  Batch,
  AIPrediction,
} from "../models/index.js";

describe("HoneyChain MongoDB Models & Data Layer Test Suite", function () {
  this.timeout(20000);

  let mongoServer: MongoMemoryServer;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await Promise.all([
      Apiary.init(),
      Hive.init(),
      AIPrediction.init(),
      Batch.init(),
      SensorReading.init(),
    ]);
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    await Promise.all([
      Apiary.deleteMany({}),
      Hive.deleteMany({}),
      SensorReading.deleteMany({}),
      Batch.deleteMany({}),
      AIPrediction.deleteMany({}),
    ]);
  });

  describe("1. Apiary Model Validation & Geolocation", function () {
    it("creates an apiary with valid fields and generates GeoJSON Point coordinates", async function () {
      const apiary = new Apiary({
        apiaryId: "APIARY-TEST-001",
        name: "Sundarbans Test Apiary",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        location: {
          latitude: 21.9497,
          longitude: 89.1833,
          region: "Sundarbans Biosphere",
          address: "Gosaba Island, WB",
          elevationMeters: 5,
        },
        floraType: ["Mangrove Wildflower", "Gewa"],
        capacity: 25,
      });

      const saved = await apiary.save();
      expect(saved.apiaryId).to.equal("APIARY-TEST-001");
      expect(saved.status).to.equal("active");
      expect(saved.location.coordinates?.type).to.equal("Point");
      expect(saved.location.coordinates?.coordinates[0]).to.equal(89.1833); // longitude
      expect(saved.location.coordinates?.coordinates[1]).to.equal(21.9497); // latitude
    });

    it("rejects apiary creation when required fields are missing", async function () {
      const apiary = new Apiary({
        name: "Incomplete Apiary",
      });

      try {
        await apiary.save();
        expect.fail("Should have thrown ValidationError");
      } catch (err: any) {
        expect(err.name).to.equal("ValidationError");
        expect(err.errors.apiaryId).to.exist;
        expect(err.errors.beekeeper).to.exist;
        expect(err.errors.location).to.exist;
      }
    });

    it("rejects latitude/longitude out of geographic bounds", async function () {
      const apiary = new Apiary({
        apiaryId: "APIARY-OUT-OF-BOUNDS",
        name: "Invalid Coordinates Apiary",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        location: {
          latitude: 120.0, // Invalid: latitude > 90
          longitude: 89.1833,
          region: "Sundarbans",
        },
      });

      try {
        await apiary.save();
        expect.fail("Should have failed coordinate validation");
      } catch (err: any) {
        expect(err.name).to.equal("ValidationError");
        expect(err.errors["location.latitude"]).to.exist;
      }
    });

    it("enforces unique apiaryId constraint", async function () {
      const a1 = new Apiary({
        apiaryId: "APIARY-DUP-01",
        name: "Original Apiary",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        location: { latitude: 21.0, longitude: 89.0, region: "Sundarbans" },
      });
      await a1.save();

      const a2 = new Apiary({
        apiaryId: "APIARY-DUP-01",
        name: "Duplicate Apiary",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        location: { latitude: 21.0, longitude: 89.0, region: "Sundarbans" },
      });

      try {
        await a2.save();
        expect.fail("Should have thrown duplicate key error");
      } catch (err: any) {
        expect(err.code).to.equal(11000);
      }
    });
  });

  describe("2. Hive Model Validation & Apiary Relationship", function () {
    let parentApiary: any;

    beforeEach(async function () {
      parentApiary = await Apiary.create({
        apiaryId: "APIARY-PARENT-01",
        name: "Parent Apiary",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        location: { latitude: 22.0, longitude: 88.0, region: "Kolkata Belt" },
      });
    });

    it("creates a hive linked to an apiary with queen and hardware device metadata", async function () {
      const hive = new Hive({
        hiveId: "HIVE-TEST-101",
        apiary: parentApiary._id,
        apiaryId: parentApiary.apiaryId,
        beekeeper: parentApiary.beekeeper,
        hiveType: "Smart-IoT-Box",
        beeSpecies: "Apis cerana indica",
        queenInfo: {
          queenId: "QN-2026-01",
          markedColor: "Yellow",
          isMated: true,
        },
        deviceMetadata: {
          deviceId: "ESP32-DEV-001",
          hardwareModel: "ESP32-S3",
          firmwareVersion: "v1.2.0",
          batteryLevelPct: 98,
        },
        currentHealthSummary: {
          healthScore: 92,
          status: "healthy",
          stressIndex: 0.1,
        },
      });

      const saved = await hive.save();
      expect(saved.hiveId).to.equal("HIVE-TEST-101");
      expect(saved.apiary.toString()).to.equal(parentApiary._id.toString());
      expect(saved.currentHealthSummary?.healthScore).to.equal(92);
      expect(saved.deviceMetadata?.batteryLevelPct).to.equal(98);
    });

    it("populates apiary relationship from hive", async function () {
      const hive = await Hive.create({
        hiveId: "HIVE-POPULATE-01",
        apiary: parentApiary._id,
        apiaryId: parentApiary.apiaryId,
        beekeeper: parentApiary.beekeeper,
        installationDate: new Date(),
      });

      const populatedHive = await Hive.findById(hive._id).populate("apiary");
      expect(populatedHive?.apiary).to.not.be.null;
      expect((populatedHive?.apiary as any).name).to.equal("Parent Apiary");
    });

    it("enforces unique hiveId constraint", async function () {
      await Hive.create({
        hiveId: "HIVE-DUP-01",
        apiary: parentApiary._id,
        apiaryId: parentApiary.apiaryId,
        beekeeper: parentApiary.beekeeper,
      });

      try {
        await Hive.create({
          hiveId: "HIVE-DUP-01",
          apiary: parentApiary._id,
          apiaryId: parentApiary.apiaryId,
          beekeeper: parentApiary.beekeeper,
        });
        expect.fail("Should have thrown duplicate hiveId error");
      } catch (err: any) {
        expect(err.code).to.equal(11000);
      }
    });
  });

  describe("3. SensorReading Model & Time-Series Query Optimization", function () {
    beforeEach(async function () {
      const readings = [];
      const baseTime = Date.now();

      // Seed 10 sequential readings 1 minute apart
      for (let i = 0; i < 10; i++) {
        readings.push({
          hiveId: "HIVE-TS-01",
          deviceId: "ESP32-TEST-01",
          timestamp: new Date(baseTime - (10 - i) * 60000),
          temperature: 34.0 + i * 0.1,
          humidity: 58.0,
          weightKg: 30.0 + i * 0.05,
          soundFrequencyHz: 215,
          acousticsDb: 60.0,
          batteryLevelPct: 95,
        });
      }

      await SensorReading.insertMany(readings);
    });

    it("fetches the latest sensor reading for a hive in O(log N) using { hiveId: 1, timestamp: -1 } index", async function () {
      const latest = await SensorReading.findOne({ hiveId: "HIVE-TS-01" })
        .sort({ timestamp: -1 })
        .lean();

      expect(latest).to.not.be.null;
      expect(latest?.temperature).to.be.closeTo(34.9, 0.01);
      expect(latest?.weightKg).to.be.closeTo(30.45, 0.01);
    });

    it("queries sensor readings within a bounded time window", async function () {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

      const windowReadings = await SensorReading.find({
        hiveId: "HIVE-TS-01",
        timestamp: { $gte: fiveMinutesAgo, $lte: now },
      }).sort({ timestamp: 1 });

      expect(windowReadings.length).to.be.greaterThan(0);
      expect(windowReadings.length).to.be.at.most(6);
    });

    it("rejects sensor reading when required temperature/humidity/weight are omitted", async function () {
      const invalidReading = new SensorReading({
        hiveId: "HIVE-TS-01",
        deviceId: "ESP32-TEST-01",
        // missing temperature, humidity, weightKg
      });

      try {
        await invalidReading.save();
        expect.fail("Should have thrown ValidationError");
      } catch (err: any) {
        expect(err.name).to.equal("ValidationError");
        expect(err.errors.temperature).to.exist;
        expect(err.errors.humidity).to.exist;
        expect(err.errors.weightKg).to.exist;
      }
    });
  });

  describe("4. AIPrediction Model Validation & Risk Classification", function () {
    it("creates an AI prediction with confidence bounds and anomaly recommendations", async function () {
      const pred = new AIPrediction({
        predictionId: "PRED-TEST-001",
        targetType: "hive",
        hiveId: "HIVE-SB-101",
        predictionType: "swarming_risk",
        modelVersion: "honeychain-swarm-v1.0",
        confidence: 0.94,
        inputWindow: {
          startTime: new Date(Date.now() - 24 * 3600000),
          endTime: new Date(),
          sampleCount: 24,
          featureSummary: { acousticPeakHz: 245 },
        },
        result: {
          status: "warning",
          riskScore: 0.76,
          detectedAnomalies: ["High acoustic pitch indicative of swarming preparations"],
          recommendedActions: ["Add honey super immediately", "Inspect for queen cells"],
        },
      });

      const saved = await pred.save();
      expect(saved.predictionId).to.equal("PRED-TEST-001");
      expect(saved.confidence).to.equal(0.94);
      expect(saved.result.status).to.equal("warning");
      expect(saved.result.detectedAnomalies?.length).to.equal(1);
    });

    it("rejects confidence scores outside [0, 1] range", async function () {
      const invalidPred = new AIPrediction({
        predictionId: "PRED-INVALID-CONF",
        targetType: "hive",
        predictionType: "colony_health",
        modelVersion: "v1.0",
        confidence: 1.5, // Invalid > 1
        result: { status: "normal" },
      });

      try {
        await invalidPred.save();
        expect.fail("Should have failed confidence range check");
      } catch (err: any) {
        expect(err.name).to.equal("ValidationError");
        expect(err.errors.confidence).to.exist;
      }
    });

    it("enforces unique predictionId constraint", async function () {
      await AIPrediction.create({
        predictionId: "PRED-DUP-01",
        targetType: "hive",
        predictionType: "colony_health",
        modelVersion: "v1.0",
        confidence: 0.85,
        result: { status: "normal" },
      });

      try {
        await AIPrediction.create({
          predictionId: "PRED-DUP-01",
          targetType: "hive",
          predictionType: "colony_health",
          modelVersion: "v1.0",
          confidence: 0.85,
          result: { status: "normal" },
        });
        expect.fail("Should have thrown duplicate predictionId error");
      } catch (err: any) {
        expect(err.code).to.equal(11000);
      }
    });
  });

  describe("5. Batch Model Provenance & Relationship Compatibility", function () {
    it("creates a batch linked to apiary and hives while preserving all blockchain fields", async function () {
      const apiary = await Apiary.create({
        apiaryId: "APIARY-BATCH-PROV",
        name: "Provenance Apiary",
        beekeeper: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        location: { latitude: 21.9, longitude: 89.1, region: "Sundarbans" },
      });

      const hive = await Hive.create({
        hiveId: "HIVE-BATCH-PROV",
        apiary: apiary._id,
        apiaryId: apiary.apiaryId,
        beekeeper: apiary.beekeeper,
      });

      const batch = new Batch({
        batchId: "HC-MODEL-TEST-001",
        batchIdBytes32: "0x" + "99".repeat(32),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        currentCustodian: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        quantityGrams: 22000,
        harvestTimestamp: 1725732000,
        floralOrigin: "Sundarbans Mangrove",
        sourceHives: ["HIVE-BATCH-PROV"],
        apiary: apiary._id,
        apiaryId: apiary.apiaryId,
        hives: [hive._id],
        apiaryLocation: {
          latitude: 21.9,
          longitude: 89.1,
          region: "Sundarbans",
        },
        metadata: { batchId: "HC-MODEL-TEST-001" },
        metadataHash: "0x" + "88".repeat(32),
        status: "Registered",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: "0x65afF3B44441FfF68171a9a0AA28063BC83C208d",
          registrationConfirmed: true,
        },
      });

      const saved = await batch.save();
      expect(saved.batchId).to.equal("HC-MODEL-TEST-001");
      expect(saved.apiary?.toString()).to.equal(apiary._id.toString());
      expect(saved.hives?.length).to.equal(1);
      expect(saved.blockchain.registrationConfirmed).to.be.true;

      // Verify populate works smoothly
      const populated = await Batch.findById(saved._id).populate("apiary").populate("hives");
      expect((populated?.apiary as any).name).to.equal("Provenance Apiary");
      expect((populated?.hives?.[0] as any).hiveId).to.equal("HIVE-BATCH-PROV");
    });
  });
});
