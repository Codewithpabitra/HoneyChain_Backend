import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { Apiary, Hive, Organization, User } from "../models/index.js";
import authService from "../services/auth.service.js";

describe("HoneyChain Apiary & Hive Management Test Suite", function () {
  this.timeout(25000);

  let mongoServer: MongoMemoryServer;

  let beekeeperOrgA: any;
  let beekeeperOrgB: any;

  let beekeeperUserA: any;
  let beekeeperTokenA: string;

  let beekeeperUserB: any;
  let beekeeperTokenB: string;

  let adminUser: any;
  let adminToken: string;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    // Create Organizations
    beekeeperOrgA = await Organization.create({
      name: "Sundarbans Wild Honey Org A",
      role: "beekeeper",
      walletAddress: "0x1111111111111111111111111111111111111111",
      status: "active",
      isActive: true,
    });

    beekeeperOrgB = await Organization.create({
      name: "Himalayan Honey Org B",
      role: "beekeeper",
      walletAddress: "0x2222222222222222222222222222222222222222",
      status: "active",
      isActive: true,
    });

    // Create Users
    beekeeperUserA = await User.create({
      name: "Beekeeper Alice",
      email: "alice@sundarbans.org",
      passwordHash: "hash123",
      role: "beekeeper",
      organizationId: beekeeperOrgA._id,
      walletAddress: beekeeperOrgA.walletAddress,
      isActive: true,
    });
    beekeeperTokenA = authService.generateToken(beekeeperUserA);

    beekeeperUserB = await User.create({
      name: "Beekeeper Bob",
      email: "bob@himalayan.org",
      passwordHash: "hash123",
      role: "beekeeper",
      organizationId: beekeeperOrgB._id,
      walletAddress: beekeeperOrgB.walletAddress,
      isActive: true,
    });
    beekeeperTokenB = authService.generateToken(beekeeperUserB);

    adminUser = await User.create({
      name: "Platform Administrator",
      email: "admin@honeychain.io",
      passwordHash: "hash123",
      role: "admin",
      isActive: true,
    });
    adminToken = authService.generateToken(adminUser);
  });

  after(async function () {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("1. Apiary Lifecycle & Multi-Tenant Scoping", function () {
    let createdApiaryA: any;

    it("POST /api/apiaries: creates apiary with valid coordinates & binds to organization", async function () {
      const res = await request(app)
        .post("/api/apiaries")
        .set("Authorization", `Bearer ${beekeeperTokenA}`)
        .send({
          apiaryId: "APIARY-SUNDAR-01",
          name: "Sundarbans Reserve Apiary",
          location: {
            latitude: 21.94,
            longitude: 88.9,
            region: "Sundarbans Mangroves",
            address: "Block 4, Mangrove Buffer Zone",
          },
          floraType: ["Mangrove", "Mustard"],
          capacity: 30,
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.apiaryId).to.equal("APIARY-SUNDAR-01");
      expect(res.body.data.name).to.equal("Sundarbans Reserve Apiary");
      expect(res.body.data.organizationId.toString()).to.equal(beekeeperOrgA._id.toString());
      expect(res.body.data.location.coordinates.coordinates).to.deep.equal([88.9, 21.94]); // GeoJSON [lng, lat]

      createdApiaryA = res.body.data;
    });

    it("POST /api/apiaries: rejects creation with coordinates out of bounds", async function () {
      const res = await request(app)
        .post("/api/apiaries")
        .set("Authorization", `Bearer ${beekeeperTokenA}`)
        .send({
          name: "Invalid Geo Apiary",
          location: {
            latitude: 95.0, // Invalid: > 90
            longitude: 88.0,
            region: "Invalid Zone",
          },
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it("GET /api/apiaries: enforces tenant isolation for regular beekeepers", async function () {
      // Beekeeper B creates an apiary in Org B
      await request(app)
        .post("/api/apiaries")
        .set("Authorization", `Bearer ${beekeeperTokenB}`)
        .send({
          apiaryId: "APIARY-HIMALAYAN-01",
          name: "Himalayan Ridge Apiary",
          location: {
            latitude: 31.1,
            longitude: 77.17,
            region: "Himachal Pradesh",
          },
        });

      // Beekeeper A should only see Org A's apiary
      const resA = await request(app)
        .get("/api/apiaries")
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(resA.status).to.equal(200);
      expect(resA.body.data).to.be.an("array");
      expect(resA.body.data.length).to.equal(1);
      expect(resA.body.data[0].apiaryId).to.equal("APIARY-SUNDAR-01");

      // Platform Admin sees all apiaries
      const resAdmin = await request(app)
        .get("/api/apiaries")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resAdmin.status).to.equal(200);
      expect(resAdmin.body.data.length).to.be.at.least(2);
    });

    it("GET /api/apiaries/:id: retrieves apiary details", async function () {
      const res = await request(app)
        .get(`/api/apiaries/${createdApiaryA.apiaryId}`)
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.apiaryId).to.equal("APIARY-SUNDAR-01");
      expect(res.body.data.hives).to.be.an("array");
    });

    it("PATCH /api/apiaries/:id: forbids update by another organization", async function () {
      const res = await request(app)
        .patch(`/api/apiaries/${createdApiaryA.apiaryId}`)
        .set("Authorization", `Bearer ${beekeeperTokenB}`)
        .send({ name: "Hijacked Apiary" });

      expect(res.status).to.equal(403);
    });

    it("PATCH /api/apiaries/:id: allows update by owner and admin", async function () {
      const res = await request(app)
        .patch(`/api/apiaries/${createdApiaryA.apiaryId}`)
        .set("Authorization", `Bearer ${beekeeperTokenA}`)
        .send({ name: "Sundarbans Sanctuary Updated", capacity: 45 });

      expect(res.status).to.equal(200);
      expect(res.body.data.name).to.equal("Sundarbans Sanctuary Updated");
      expect(res.body.data.capacity).to.equal(45);
    });
  });

  describe("2. Hive Lifecycle & Parent Apiary Relation", function () {
    let createdHiveId = "HIVE-SD-001";

    it("POST /api/hives: creates hive linked to parent apiary & initializes health summary", async function () {
      const res = await request(app)
        .post("/api/hives")
        .set("Authorization", `Bearer ${beekeeperTokenA}`)
        .send({
          hiveId: createdHiveId,
          apiaryId: "APIARY-SUNDAR-01",
          hiveType: "Langstroth",
          queenDetails: {
            installedDate: new Date(),
            breed: "Apis cerana",
            marked: true,
          },
          deviceMetadata: {
            deviceId: "DEV-ESP32-101",
            hardwareModel: "ESP32-S3-V2",
            batteryLevelPct: 98,
          },
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.hiveId).to.equal(createdHiveId);
      expect(res.body.data.apiaryId).to.equal("APIARY-SUNDAR-01");
      expect(res.body.data.status).to.equal("active");
      expect(res.body.data.currentHealthSummary.healthScore).to.equal(100);
      expect(res.body.data.currentHealthSummary.status).to.equal("healthy");
    });

    it("POST /api/hives: rejects creation with nonexistent apiaryId", async function () {
      const res = await request(app)
        .post("/api/hives")
        .set("Authorization", `Bearer ${beekeeperTokenA}`)
        .send({
          hiveId: "HIVE-GHOST-01",
          apiaryId: "NONEXISTENT-APIARY",
        });

      expect(res.status).to.equal(404);
      expect(res.body.error.message).to.include("not found");
    });

    it("GET /api/hives & GET /hives (alias): lists hives with populating parent apiary", async function () {
      const res = await request(app)
        .get("/api/hives")
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an("array");
      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].hiveId).to.equal(createdHiveId);
      expect(res.body.data[0].apiary).to.be.an("object");
      expect(res.body.data[0].apiary.name).to.equal("Sundarbans Sanctuary Updated");

      // Verify frontend compatibility alias /hives
      const resAlias = await request(app)
        .get("/hives")
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(resAlias.status).to.equal(200);
      expect(resAlias.body.data.length).to.equal(1);
    });

    it("GET /api/hives/:hiveId: retrieves hive by hiveId with parent apiary populated", async function () {
      const res = await request(app)
        .get(`/api/hives/${createdHiveId}`)
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.hiveId).to.equal(createdHiveId);
      expect(res.body.data.apiary).to.be.an("object");
    });

    it("PATCH /api/hives/:hiveId: updates hive fields safely", async function () {
      const res = await request(app)
        .patch(`/api/hives/${createdHiveId}`)
        .set("Authorization", `Bearer ${beekeeperTokenA}`)
        .send({
          notes: "Super added for honey flow",
          status: "active",
        });

      expect(res.status).to.equal(200);
      expect(res.body.data.notes).to.equal("Super added for honey flow");
    });

    it("DELETE /api/hives/:hiveId: deletes hive with authorization", async function () {
      // Forbidden for beekeeper from another org
      const forbiddenRes = await request(app)
        .delete(`/api/hives/${createdHiveId}`)
        .set("Authorization", `Bearer ${beekeeperTokenB}`);

      expect(forbiddenRes.status).to.equal(403);

      // Allowed for owner
      const deleteRes = await request(app)
        .delete(`/api/hives/${createdHiveId}`)
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(deleteRes.status).to.equal(200);
      expect(deleteRes.body.success).to.be.true;

      // Verify deleted
      const checkRes = await request(app)
        .get(`/api/hives/${createdHiveId}`)
        .set("Authorization", `Bearer ${beekeeperTokenA}`);

      expect(checkRes.status).to.equal(404);
    });
  });
});
