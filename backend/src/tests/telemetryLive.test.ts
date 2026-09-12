import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import http from "http";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { Hive, Apiary, User, SensorReading } from "../models/index.js";
import redisService from "../services/redis.service.js";
import socketService from "../services/socket.service.js";
import authService from "../services/auth.service.js";

describe("HoneyChain Live Telemetry: Redis Buffer & Socket.IO Test Suite", function () {
  this.timeout(25000);

  let mongoServer: MongoMemoryServer;
  let testServer: http.Server;
  let serverPort: number;
  let farmerToken: string;
  let unauthorizedToken: string;
  let adminToken: string;
  let farmerUser: any;
  let unauthorizedUser: any;
  let adminUser: any;
  let testHive: any;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    await Promise.all([
      User.init(),
      Apiary.init(),
      Hive.init(),
      SensorReading.init(),
    ]);

    // Create users
    farmerUser = await User.create({
      name: "Farmer John",
      email: "farmer.live@honeychain.io",
      passwordHash: "hashedpwd123",
      role: "beekeeper",
      walletAddress: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
      status: "active",
      emailVerified: true,
    });

    unauthorizedUser = await User.create({
      name: "Outsider Jane",
      email: "outsider@otherfarm.io",
      passwordHash: "hashedpwd123",
      role: "beekeeper",
      walletAddress: "0x2222222222222222222222222222222222222222",
      status: "active",
      emailVerified: true,
    });

    adminUser = await User.create({
      name: "Admin Alice",
      email: "admin.live@honeychain.io",
      passwordHash: "hashedpwd123",
      role: "admin",
      walletAddress: "0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08",
      status: "active",
      emailVerified: true,
    });

    farmerToken = authService.generateToken(farmerUser);
    unauthorizedToken = authService.generateToken(unauthorizedUser);
    adminToken = authService.generateToken(adminUser);

    const apiary = await Apiary.create({
      apiaryId: "APIARY-LIVE-01",
      name: "Live Telemetry Apiary",
      beekeeper: farmerUser.walletAddress,
      location: { latitude: 22.5, longitude: 88.3, region: "Sundarbans" },
    });

    testHive = await Hive.create({
      hiveId: "HIVE-LIVE-TEST",
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      beekeeper: farmerUser.walletAddress,
      createdBy: farmerUser._id,
      status: "active",
      deviceMetadata: {
        deviceId: "ESP32-LIVE-TEST",
        batteryLevelPct: 98,
      },
      currentHealthSummary: {
        healthScore: 92,
        status: "healthy",
      },
    });

    // Start local HTTP server with Socket.IO attached
    testServer = http.createServer(app);
    socketService.init(testServer);

    await new Promise<void>((resolve) => {
      testServer.listen(0, () => {
        const addr = testServer.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  after(async function () {
    socketService.close();
    await redisService.close();
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("1. Redis Rolling Buffer Unit Logic", function () {
    const hiveId = "HIVE-ROLLING-TEST";

    beforeEach(async function () {
      await redisService.clearRecentReadings(hiveId);
    });

    it("should keep at most 10 recent readings and preserve chronological order", async function () {
      for (let i = 1; i <= 15; i++) {
        await redisService.addRecentReading(hiveId, {
          index: i,
          temperature: 34 + i * 0.1,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        });
      }

      const readings = await redisService.getRecentReadings(hiveId);
      expect(readings).to.be.an("array");
      expect(readings.length).to.equal(10);
      // Index should run from 6 to 15 (chronological order)
      expect(readings[0].index).to.equal(6);
      expect(readings[readings.length - 1].index).to.equal(15);
    });

    it("should reject duplicate readings by unique reading ID", async function () {
      const reading = {
        id: "read-ESP32-DUP-01",
        deviceId: "ESP32-DUP-01",
        temperature: 34.5,
        timestamp: "2026-09-12T10:00:00.000Z",
      };

      const addedFirst = await redisService.addRecentReading(hiveId, reading);
      expect(addedFirst).to.be.true;

      const addedSecond = await redisService.addRecentReading(hiveId, reading);
      expect(addedSecond).to.be.false;

      const readings = await redisService.getRecentReadings(hiveId);
      expect(readings.length).to.equal(1);
    });

    it("should reject duplicate readings by matching deviceId and exact timestamp", async function () {
      const reading1 = {
        deviceId: "ESP32-DUP-02",
        temperature: 34.8,
        timestamp: "2026-09-12T10:05:00.000Z",
      };
      const reading2 = {
        deviceId: "ESP32-DUP-02",
        temperature: 34.8, // Same sensor values sent 1s later but same recorded timestamp
        timestamp: "2026-09-12T10:05:00.000Z",
      };

      const addedFirst = await redisService.addRecentReading(hiveId, reading1);
      expect(addedFirst).to.be.true;

      const addedSecond = await redisService.addRecentReading(hiveId, reading2);
      expect(addedSecond).to.be.false;

      const readings = await redisService.getRecentReadings(hiveId);
      expect(readings.length).to.equal(1);
    });
  });

  describe("2. Socket.IO Authentication & Room Subscription", function () {
    let clientSocket: ClientSocket | null = null;

    afterEach(function () {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
      clientSocket = null;
    });

    it("should reject connection when no authentication token is provided", function (done) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ["websocket"],
      });

      clientSocket.on("connect_error", (err) => {
        expect(err.message).to.include("Authentication error");
        done();
      });

      clientSocket.on("connect", () => {
        done(new Error("Should not connect without token"));
      });
    });

    it("should allow connection with valid JWT bearer token", function (done) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${farmerToken}` },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        expect(clientSocket?.connected).to.be.true;
        done();
      });

      clientSocket.on("connect_error", (err) => {
        done(err);
      });
    });

    it("should allow authorized beekeeper to join their hive room", function (done) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${farmerToken}` },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket?.emit("join:hive", { hiveId: testHive.hiveId }, (response: any) => {
          expect(response.success).to.be.true;
          expect(response.room).to.equal(`hive:${testHive.hiveId}`);
          done();
        });
      });
    });

    it("should deny unauthorized beekeeper from joining another user's hive room", function (done) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${unauthorizedToken}` },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket?.emit("join:hive", { hiveId: testHive.hiveId }, (response: any) => {
          expect(response.success).to.be.false;
          expect(response.error).to.include("Unauthorized");
          done();
        });
      });
    });

    it("should allow admin to join any hive room", function (done) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${adminToken}` },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket?.emit("join:hive", { hiveId: testHive.hiveId }, (response: any) => {
          expect(response.success).to.be.true;
          done();
        });
      });
    });

    it("should receive telemetry:received event when live telemetry is emitted", function (done) {
      clientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: `Bearer ${farmerToken}` },
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clientSocket?.emit("join:hive", { hiveId: testHive.hiveId }, (joinRes: any) => {
          expect(joinRes.success).to.be.true;

          // Listen for telemetry:received event
          clientSocket?.on("telemetry:received", (payload: any) => {
            expect(payload.hiveId).to.equal(testHive.hiveId);
            expect(payload.temperature).to.equal(35.2);
            done();
          });

          // Emit event from server
          socketService.emitHiveTelemetry(testHive.hiveId, {
            hiveId: testHive.hiveId,
            temperature: 35.2,
            humidity: 60.1,
            weightKg: 28.5,
            timestamp: new Date().toISOString(),
          });
        });
      });
    });
  });

  describe("3. GET /api/iot/telemetry/:hiveId/recent", function () {
    beforeEach(async function () {
      await redisService.clearRecentReadings(testHive.hiveId);
    });

    it("should require authentication (401)", async function () {
      const res = await request(app).get(`/api/iot/telemetry/${testHive.hiveId}/recent`);
      expect(res.status).to.equal(401);
    });

    it("should reject unauthorized user (403)", async function () {
      const res = await request(app)
        .get(`/api/iot/telemetry/${testHive.hiveId}/recent`)
        .set("Authorization", `Bearer ${unauthorizedToken}`);
      expect(res.status).to.equal(403);
    });

    it("should return recent readings from Redis for authorized beekeeper", async function () {
      // Seed Redis with 3 readings
      for (let i = 1; i <= 3; i++) {
        await redisService.addRecentReading(testHive.hiveId, {
          hiveId: testHive.hiveId,
          temperature: 34.0 + i,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        });
      }

      const res = await request(app)
        .get(`/api/iot/telemetry/${testHive.hiveId}/recent`)
        .set("Authorization", `Bearer ${farmerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.hiveId).to.equal(testHive.hiveId);
      expect(res.body.count).to.equal(3);
      expect(res.body.data).to.be.an("array").with.lengthOf(3);
      expect(res.body.data[0].temperature).to.equal(35.0);
      expect(res.body.data[2].temperature).to.equal(37.0);
    });

    it("should fall back to MongoDB on cold start when Redis has no entries", async function () {
      // Clear Redis
      await redisService.clearRecentReadings(testHive.hiveId);

      // Create a MongoDB sensor reading
      await SensorReading.create({
        hiveId: testHive.hiveId,
        hive: testHive._id,
        deviceId: testHive.deviceMetadata.deviceId,
        timestamp: new Date(),
        temperature: 34.8,
        humidity: 62.0,
        weightKg: 29.1,
      });

      const res = await request(app)
        .get(`/api/iot/telemetry/${testHive.hiveId}/recent`)
        .set("Authorization", `Bearer ${farmerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.source).to.equal("mongodb-fallback");
      expect(res.body.count).to.be.at.least(1);
    });

    it("should prevent duplicate telemetry ingestion into Redis buffer for unpersisted high-frequency readings", async function () {
      await redisService.clearRecentReadings(testHive.hiveId);

      const readingData = {
        id: "read-LIVE-DEDUP-01",
        deviceId: testHive.deviceMetadata.deviceId,
        hiveId: testHive.hiveId,
        timestamp: new Date().toISOString(),
        temperature: 35.2,
        humidity: 58.0,
        weightKg: 28.5,
        batteryLevelPct: 90,
      };

      // 1. First ingestion (persisted or high-frequency)
      const res1 = await request(app).post("/api/iot/telemetry").send(readingData);
      expect([200, 201]).to.include(res1.status);
      expect(res1.body.success).to.be.true;

      // 2. Exact duplicate retry
      const res2 = await request(app).post("/api/iot/telemetry").send(readingData);
      expect(res2.status).to.equal(200);
      expect(res2.body.duplicate).to.be.true;

      // 3. Verify Redis buffer has exactly 1 entry, not 2
      const readings = await redisService.getRecentReadings(testHive.hiveId);
      expect(readings.length).to.equal(1);
    });
  });
});
