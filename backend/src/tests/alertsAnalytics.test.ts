import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import {
  Apiary,
  Hive,
  SensorReading,
  Batch,
  Harvest,
  Alert,
  Organization,
  User,
} from "../models/index.js";
import authService from "../services/auth.service.js";
import alertService from "../services/alert.service.js";

describe("HoneyChain Alerts, Harvests, IoT Diagnostics & Analytics Test Suite", function () {
  this.timeout(25000);

  let mongoServer: MongoMemoryServer;

  let testOrg: any;
  let beekeeperUser: any;
  let beekeeperToken: string;

  let adminUser: any;
  let adminToken: string;

  let testApiary: any;
  let testHive: any;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    testOrg = await Organization.create({
      name: "Sundarbans Ecological Cooperative",
      role: "beekeeper",
      walletAddress: "0x1111111111111111111111111111111111111111",
      status: "active",
      isActive: true,
    });

    beekeeperUser = await User.create({
      name: "Beekeeper Dev",
      email: "beekeeper.dev@honeychain.org",
      passwordHash: "hash123",
      role: "beekeeper",
      organizationId: testOrg._id,
      walletAddress: testOrg.walletAddress,
      isActive: true,
    });
    beekeeperToken = authService.generateToken(beekeeperUser);

    adminUser = await User.create({
      name: "Platform Admin",
      email: "admin.alerts@honeychain.io",
      passwordHash: "hash123",
      role: "admin",
      isActive: true,
    });
    adminToken = authService.generateToken(adminUser);

    testApiary = await Apiary.create({
      apiaryId: "APIARY-ANALYTICS-01",
      name: "Sajnekhali Mangrove Sanctuary",
      beekeeper: testOrg.walletAddress,
      organizationId: testOrg._id,
      location: {
        latitude: 22.12,
        longitude: 88.82,
        region: "Sundarbans Delta",
        address: "Sajnekhali Island",
      },
      capacity: 25,
    });

    testHive = await Hive.create({
      hiveId: "HIVE-ANALYTICS-01",
      apiary: testApiary._id,
      apiaryId: testApiary.apiaryId,
      beekeeper: testOrg.walletAddress,
      organizationId: testOrg._id,
      status: "active",
      deviceMetadata: {
        deviceId: "ESP32-ANALYTICS-DEV-01",
        hardwareModel: "ESP32-S3",
        batteryLevelPct: 88,
      },
      currentHealthSummary: {
        healthScore: 88,
        status: "healthy",
      },
    });
  });

  after(async function () {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("1. Alert System & Deduplication Cooldown", function () {
    it("creates alert and deduplicates identical alert within cooldown window", async function () {
      const alert1 = await alertService.createAlert({
        hiveId: testHive.hiveId,
        apiaryId: testHive.apiaryId,
        organizationId: testOrg._id,
        severity: "warning",
        alertType: "HYPOTHERMIA",
        message: "Hive temperature low: 30.5°C",
      });

      expect(alert1).to.exist;
      expect(alert1.alertType).to.equal("HYPOTHERMIA");

      // Attempt to trigger duplicate alert immediately
      const alert2 = await alertService.createAlert({
        hiveId: testHive.hiveId,
        apiaryId: testHive.apiaryId,
        organizationId: testOrg._id,
        severity: "warning",
        alertType: "HYPOTHERMIA",
        message: "Hive temperature still low: 30.2°C",
      });

      // Should return original alert instance without creating a second record
      expect(alert2._id.toString()).to.equal(alert1._id.toString());
      const count = await Alert.countDocuments({
        hiveId: testHive.hiveId,
        alertType: "HYPOTHERMIA",
      });
      expect(count).to.equal(1);
    });

    it("GET /api/alerts: retrieves active alerts for organization", async function () {
      const res = await request(app)
        .get("/api/alerts")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an("array");
      expect(res.body.data.length).to.be.at.least(1);
      expect(res.body.data[0].hiveId).to.equal(testHive.hiveId);
    });

    it("PATCH /api/alerts/:id/resolve: marks alert resolved", async function () {
      const existingAlert = await Alert.findOne({ hiveId: testHive.hiveId });
      expect(existingAlert).to.exist;

      const res = await request(app)
        .patch(`/api/alerts/${existingAlert!._id}/resolve`)
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.isResolved).to.be.true;
      expect(res.body.data.resolvedBy).to.equal(beekeeperUser._id.toString());
    });

    it("IoT ingestion triggers automated alert when temperature drops below threshold (<32°C)", async function () {
      const telemetryRes = await request(app)
        .post("/api/iot/telemetry")
        .send({
          deviceId: "ESP32-ANALYTICS-DEV-01",
          hiveId: testHive.hiveId,
          timestamp: new Date().toISOString(),
          temperature: 28.5, // Critical hypothermia
          humidity: 60.0,
          weightKg: 22.0,
          batteryLevelPct: 85,
        });

      expect(telemetryRes.status).to.be.oneOf([200, 201]);

      // Verify alert was generated in database
      const hypothermiaAlert = await Alert.findOne({
        hiveId: testHive.hiveId,
        alertType: "temperature_hypothermia",
        isResolved: false,
      });
      expect(hypothermiaAlert).to.exist;
      expect(hypothermiaAlert?.severity).to.equal("critical");
    });
  });

  describe("2. Harvest Workflow (POST/GET /api/harvests)", function () {
    let createdHarvestId: string;

    it("POST /api/harvests: creates a harvest record linked to hive and organization", async function () {
      const res = await request(app)
        .post("/api/harvests")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send({
          hiveId: testHive.hiveId,
          quantityGrams: 15500,
          floralOrigin: "Sundarbans Khalisha",
          notes: "First spring extraction",
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.hiveId).to.equal(testHive.hiveId);
      expect(res.body.data.quantityGrams).to.equal(15500);
      expect(res.body.data.floralOrigin).to.equal("Sundarbans Khalisha");
      expect(res.body.data.organizationId.toString()).to.equal(testOrg._id.toString());

      createdHarvestId = res.body.data.harvestId;
    });

    it("GET /api/harvests & GET /harvests (alias): lists harvests with tenant scoping", async function () {
      const res = await request(app)
        .get("/api/harvests")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an("array");
      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].harvestId).to.equal(createdHarvestId);

      // Frontend compatibility alias
      const resAlias = await request(app)
        .get("/harvests")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(resAlias.status).to.equal(200);
      expect(resAlias.body.data.length).to.equal(1);
    });

    it("GET /api/harvests/:harvestId: retrieves specific harvest details", async function () {
      const res = await request(app)
        .get(`/api/harvests/${createdHarvestId}`)
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.harvestId).to.equal(createdHarvestId);
      expect(res.body.data.quantityGrams).to.equal(15500);
    });
  });

  describe("3. Telemetry History & Device Status Endpoints", function () {
    it("GET /api/iot/telemetry/:hiveId: retrieves telemetry history in raw & hourly resolution", async function () {
      // Raw resolution
      const rawRes = await request(app)
        .get(`/api/iot/telemetry/${testHive.hiveId}?resolution=raw`)
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(rawRes.status).to.equal(200);
      expect(rawRes.body.success).to.be.true;
      expect(rawRes.body.data).to.be.an("array");
      expect(rawRes.body.data.length).to.be.at.least(1);

      // Hourly resolution
      const hourlyRes = await request(app)
        .get(`/api/iot/telemetry/${testHive.hiveId}?resolution=hourly`)
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(hourlyRes.status).to.equal(200);
      expect(hourlyRes.body.data).to.be.an("array");
    });

    it("GET /api/iot/devices/:deviceId/status: retrieves hardware status & battery level", async function () {
      const res = await request(app)
        .get("/api/iot/devices/ESP32-ANALYTICS-DEV-01/status")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.deviceId).to.equal("ESP32-ANALYTICS-DEV-01");
      expect(res.body.data.status).to.equal("online");
      expect(res.body.data.batteryLevelPct).to.equal(85);
      expect(res.body.data.hiveId).to.equal(testHive.hiveId);
    });
  });

  describe("4. Dashboard Analytics & Regional Apiary Clusters", function () {
    it("GET /api/analytics/dashboard: returns real aggregated operational metrics", async function () {
      const res = await request(app)
        .get("/api/analytics/dashboard")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      const stats = res.body.data;

      // Real aggregates check
      expect(stats.hives.total).to.be.at.least(1);
      expect(stats.hives.active).to.be.at.least(1);
      expect(stats.alerts.active).to.be.at.least(1);
      expect(stats.harvests.total).to.be.at.least(1);
      expect(stats.harvests.totalQuantityGrams).to.equal(15500);
      expect(stats.telemetry.totalReadings).to.be.at.least(1);
      expect(stats.organizations.total).to.be.at.least(1);
    });

    it("GET /api/analytics/clusters: groups apiaries into regional clusters with centroids", async function () {
      const res = await request(app)
        .get("/api/analytics/clusters")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.summary.activeClusters).to.be.at.least(1);
      expect(res.body.summary.hivesCovered).to.be.at.least(1);
      expect(res.body.data).to.be.an("array");

      const cluster = res.body.data.find(
        (c: any) => c.region === "Sundarbans Delta"
      );
      expect(cluster).to.exist;
      expect(cluster.apiaryCount).to.equal(1);
      expect(cluster.totalHives).to.equal(1);
      expect(cluster.avgLatitude).to.equal(22.12);
      expect(cluster.avgLongitude).to.equal(88.82);
    });
  });
});
