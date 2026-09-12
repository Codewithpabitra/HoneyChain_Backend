import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { Batch } from "../models/Batch.js";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import authService from "../services/auth.service.js";
import blockchainService from "../services/blockchain.service.js";

describe("HoneyChain Extended Batch Management, Certificate Upload & Delivery Test Suite", function () {
  this.timeout(25000);

  let mongoServer: MongoMemoryServer;

  let beekeeperUser: any;
  let beekeeperToken: string;

  let labUser: any;
  let labToken: string;

  let transporterUser: any;
  let transporterToken: string;

  let beekeeperOrg: any;
  let transporterOrg: any;

  let auditorUser: any;
  let auditorToken: string;

  let originalDeliverBatch: any;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    beekeeperOrg = await Organization.create({
      name: "Beekeeper Union",
      role: "beekeeper",
      walletAddress: "0x1111111111111111111111111111111111111111",
      status: "active",
      isActive: true,
    });

    const labOrg = await Organization.create({
      name: "Testing Laboratory Org",
      role: "lab",
      walletAddress: "0x2222222222222222222222222222222222222222",
      status: "active",
      isActive: true,
    });

    transporterOrg = await Organization.create({
      name: "Express Logistics Org",
      role: "transporter",
      walletAddress: "0x3333333333333333333333333333333333333333",
      status: "active",
      isActive: true,
    });

    beekeeperUser = await User.create({
      name: "Alice Beekeeper",
      email: "alice@union.org",
      passwordHash: "hash123",
      role: "beekeeper",
      organizationId: beekeeperOrg._id,
      walletAddress: beekeeperOrg.walletAddress,
      isActive: true,
    });
    beekeeperToken = authService.generateToken(beekeeperUser);

    labUser = await User.create({
      name: "Bob Lab Technician",
      email: "bob@lab.org",
      passwordHash: "hash123",
      role: "lab",
      organizationId: labOrg._id,
      walletAddress: labOrg.walletAddress,
      isActive: true,
    });
    labToken = authService.generateToken(labUser);

    transporterUser = await User.create({
      name: "Charlie Logistics",
      email: "charlie@logistics.org",
      passwordHash: "hash123",
      role: "transporter",
      organizationId: transporterOrg._id,
      walletAddress: transporterOrg.walletAddress,
      isActive: true,
    });
    transporterToken = authService.generateToken(transporterUser);

    auditorUser = await User.create({
      name: "Auditor Diane",
      email: "diane@audit.org",
      passwordHash: "hash123",
      role: "auditor",
      isActive: true,
    });
    auditorToken = authService.generateToken(auditorUser);

    // Save and stub blockchainService.deliverBatch
    originalDeliverBatch = blockchainService.deliverBatch;
    blockchainService.deliverBatch = async () => ({
      txHash: "0x" + "aa".repeat(32),
      blockNumber: 99999,
      network: "Sepolia",
      gasUsed: "45000",
      status: 1,
    });
  });

  after(async function () {
    blockchainService.deliverBatch = originalDeliverBatch;
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async function () {
    await Batch.deleteMany({});

    // Seed test batches
    await Batch.create([
      {
        batchId: "HC-BATCH-TEST-001",
        batchIdBytes32: "0x" + "11".repeat(32),
        producer: beekeeperOrg.walletAddress,
        currentCustodian: beekeeperOrg.walletAddress,
        floralOrigin: "Wildflower Sundarbans",
        quantityGrams: 250000,
        harvestTimestamp: Math.floor(Date.now() / 1000),
        sourceHives: ["HIVE-001"],
        apiaryLocation: {
          latitude: 22.57,
          longitude: 88.36,
          region: "Sundarbans",
        },
        metadata: { batchId: "HC-BATCH-TEST-001" },
        metadataHash: "0x" + "11".repeat(32),
        status: "Registered",
        quality: {
          grade: "None",
        },
        custodyHistory: [
          {
            from: beekeeperOrg.walletAddress,
            to: beekeeperOrg.walletAddress,
            location: "Kolkata Apiary",
            timestamp: Math.floor(Date.now() / 1000),
            txHash: "0x" + "11".repeat(32),
          },
        ],
        recall: {
          recalled: false,
        },
        blockchain: {
          network: "Sepolia",
          chainId: 11155111,
          contractAddress: "0x65afF3B44441FfF68171a9a0AA28063BC83C208d",
          registrationConfirmed: true,
        },
      },
      {
        batchId: "HC-BATCH-TEST-002",
        batchIdBytes32: "0x" + "22".repeat(32),
        producer: beekeeperOrg.walletAddress,
        currentCustodian: transporterOrg.walletAddress,
        floralOrigin: "Mustard Flower",
        quantityGrams: 500000,
        harvestTimestamp: Math.floor(Date.now() / 1000) - 3600,
        sourceHives: ["HIVE-002"],
        apiaryLocation: {
          latitude: 22.57,
          longitude: 88.36,
          region: "Kolkata Hub",
        },
        metadata: { batchId: "HC-BATCH-TEST-002" },
        metadataHash: "0x" + "22".repeat(32),
        status: "InTransit",
        quality: {
          grade: "GradeA",
          moisturePercentage: 17.5,
        },
        custodyHistory: [
          {
            from: beekeeperOrg.walletAddress,
            to: transporterOrg.walletAddress,
            location: "Kolkata Apiary",
            timestamp: Math.floor(Date.now() / 1000) - 3600,
            txHash: "0x" + "11".repeat(32),
          },
        ],
        recall: {
          recalled: false,
        },
        blockchain: {
          network: "Sepolia",
          chainId: 11155111,
          contractAddress: "0x65afF3B44441FfF68171a9a0AA28063BC83C208d",
          registrationConfirmed: true,
        },
      },
    ]);
  });

  describe("1. GET /api/batches: Pagination, Filtering & Search", function () {
    it("returns paginated list of batches", async function () {
      const res = await request(app)
        .get("/api/batches?page=1&limit=1")
        .set("Authorization", `Bearer ${auditorToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.length).to.equal(1);
      expect(res.body.pagination.total).to.equal(2);
      expect(res.body.pagination.totalPages).to.equal(2);
    });

    it("filters batches by status (e.g. InTransit)", async function () {
      const res = await request(app)
        .get("/api/batches?status=InTransit")
        .set("Authorization", `Bearer ${auditorToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].batchId).to.equal("HC-BATCH-TEST-002");
    });

    it("searches batches by floralOrigin", async function () {
      const res = await request(app)
        .get("/api/batches?search=Sundarbans")
        .set("Authorization", `Bearer ${auditorToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].floralOrigin).to.include("Sundarbans");
    });
  });

  describe("2. GET /api/batches/:batchId", function () {
    it("retrieves batch details by batchId", async function () {
      const res = await request(app)
        .get("/api/batches/HC-BATCH-TEST-001")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.batchId).to.equal("HC-BATCH-TEST-001");
      expect(res.body.data.quantityGrams).to.equal(250000);
    });

    it("returns 404 for nonexistent batchId", async function () {
      const res = await request(app)
        .get("/api/batches/HC-NONEXISTENT")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
    });
  });

  describe("3. POST /api/batches/:batchId/certificate: Lab PDF Upload", function () {
    it("rejects non-lab user from uploading certificate", async function () {
      const res = await request(app)
        .post("/api/batches/HC-BATCH-TEST-001/certificate")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send({
          fileName: "cert.pdf",
          fileData: Buffer.from("%PDF-1.4 test").toString("base64"),
        });

      expect(res.status).to.equal(403);
    });

    it("rejects non-PDF file upload (magic byte validation)", async function () {
      const res = await request(app)
        .post("/api/batches/HC-BATCH-TEST-001/certificate")
        .set("Authorization", `Bearer ${labToken}`)
        .send({
          fileName: "cert.txt",
          fileData: Buffer.from("MALICIOUS_EXE_OR_TXT_CONTENT").toString("base64"),
        });

      expect(res.status).to.equal(400);
      expect(res.body.error.message).to.include("PDF");
    });

    it("accepts valid PDF certificate, calculates SHA-256 hash & updates batch", async function () {
      const fakePdfContent = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

      const res = await request(app)
        .post("/api/batches/HC-BATCH-TEST-001/certificate")
        .set("Authorization", `Bearer ${labToken}`)
        .send({
          fileName: "honey_analysis.pdf",
          fileData: fakePdfContent.toString("base64"),
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.labReportHash).to.match(/^0x[a-f0-9]{64}$/);
      expect(res.body.labReportUrl).to.be.a("string");

      // Verify MongoDB batch was updated
      const updated = await Batch.findOne({ batchId: "HC-BATCH-TEST-001" });
      expect(updated?.quality?.labReportHash).to.equal(res.body.labReportHash);
      expect(updated?.quality?.labReportUrl).to.equal(res.body.labReportUrl);
    });
  });

  describe("4. POST /api/batches/:batchId/deliver: Batch Delivery", function () {
    it("rejects unauthorized user from delivering batch", async function () {
      const res = await request(app)
        .post("/api/batches/HC-BATCH-TEST-002/deliver")
        .set("Authorization", `Bearer ${labToken}`)
        .send({
          location: "Warehouse D",
          to: "0x4444444444444444444444444444444444444444",
        });

      expect(res.status).to.equal(403);
    });

    it("transports & delivers batch successfully, updating MongoDB and invoking blockchain", async function () {
      const recipient = "0x5555555555555555555555555555555555555555";
      const res = await request(app)
        .post("/api/batches/HC-BATCH-TEST-002/deliver")
        .set("Authorization", `Bearer ${transporterToken}`)
        .send({
          location: "Terminal Distribution Facility 12",
          to: recipient,
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.status).to.equal("Delivered");
      expect(res.body.data.currentCustodian.toLowerCase()).to.equal(recipient.toLowerCase());

      // Verify custody record
      const custodyRecord = res.body.data.custodyHistory[res.body.data.custodyHistory.length - 1];
      expect(custodyRecord.location).to.include("DELIVERED: Terminal Distribution Facility 12");
      expect(custodyRecord.to.toLowerCase()).to.equal(recipient.toLowerCase());
    });
  });
});
