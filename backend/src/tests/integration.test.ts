import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { Batch } from "../models/Batch.js";
import { User } from "../models/User.js";
import authService from "../services/auth.service.js";
import blockchainService, {
  QualityGrade,
} from "../services/blockchain.service.js";
import AppError from "../utils/AppError.js";

describe("HoneyChain Backend & Blockchain Integration Test Suite", function () {
  this.timeout(20000);

  let mongoServer: MongoMemoryServer;
  let beekeeperToken: string;
  let labToken: string;
  let processorToken: string;
  let auditorToken: string;
  let originalRegisterBatch: any;
  let originalCertifyBatch: any;
  let originalTransferCustody: any;
  let originalRecallBatch: any;
  let originalGetBatch: any;
  let originalGetBatchHistory: any;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create test role users and issue tokens
    const bk = await User.create({
      name: "Integration Beekeeper",
      email: "bk.integration@honeychain.org",
      passwordHash: "hash123",
      role: "beekeeper",
      isActive: true,
    });
    beekeeperToken = authService.generateToken(bk);

    const lab = await User.create({
      name: "Integration Lab",
      email: "lab.integration@honeychain.org",
      passwordHash: "hash123",
      role: "lab",
      isActive: true,
    });
    labToken = authService.generateToken(lab);

    const proc = await User.create({
      name: "Integration Processor",
      email: "proc.integration@honeychain.org",
      passwordHash: "hash123",
      role: "processor",
      isActive: true,
    });
    processorToken = authService.generateToken(proc);

    const aud = await User.create({
      name: "Integration Auditor",
      email: "aud.integration@honeychain.org",
      passwordHash: "hash123",
      role: "auditor",
      isActive: true,
    });
    auditorToken = authService.generateToken(aud);

    // Save originals for restoration
    originalRegisterBatch = blockchainService.registerBatch;
    originalCertifyBatch = blockchainService.certifyBatch;
    originalTransferCustody = blockchainService.transferCustody;
    originalRecallBatch = blockchainService.recallBatch;
    originalGetBatch = blockchainService.getBatch;
    originalGetBatchHistory = blockchainService.getBatchHistory;
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    await Batch.deleteMany({});
  });

  afterEach(function () {
    // Restore any stubbed methods
    blockchainService.registerBatch = originalRegisterBatch;
    blockchainService.certifyBatch = originalCertifyBatch;
    blockchainService.transferCustody = originalTransferCustody;
    blockchainService.recallBatch = originalRecallBatch;
    blockchainService.getBatch = originalGetBatch;
    blockchainService.getBatchHistory = originalGetBatchHistory;
  });

  describe("1. BlockchainService Hashing & Utility Functions", function () {
    it("formatBytes32BatchId converts string ID into deterministic 32-byte hex", function () {
      const hex1 = blockchainService.formatBytes32BatchId("HC-BATCH-TEST-001");
      const hex2 = blockchainService.formatBytes32BatchId("HC-BATCH-TEST-001");
      expect(hex1).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(hex1).to.equal(hex2);

      // Raw 32-byte hex should be returned directly
      const raw = "0x" + "11".repeat(32);
      expect(blockchainService.formatBytes32BatchId(raw)).to.equal(raw);
    });

    it("generateMetadataHash produces deterministic canonical SHA-256 digest regardless of key order", function () {
      const objA = { z: 1, a: 2, m: { y: "test", b: 10 } };
      const objB = { a: 2, m: { b: 10, y: "test" }, z: 1 };
      const hashA = blockchainService.generateMetadataHash(objA);
      const hashB = blockchainService.generateMetadataHash(objB);
      expect(hashA).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(hashA).to.equal(hashB);
    });

    it("generateLabReportHash computes SHA-256 digest of lab data", function () {
      const labData = { certNumber: "LAB-2026-X1", moisture: 17.5 };
      const hash = blockchainService.generateLabReportHash(labData);
      expect(hash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("2. POST /api/batches (Batch Registration)", function () {
    it("successfully registers batch, stores in MongoDB, and records on-chain tx metadata", async function () {
      const mockTxHash = "0x" + "a1".repeat(32);
      const mockBlockNumber = 11655700;

      // Mock blockchain call
      blockchainService.registerBatch = async (batchId, qty, hash, ts) => {
        return {
          success: true,
          batchId,
          batchIdBytes32: blockchainService.formatBytes32BatchId(batchId),
          txHash: mockTxHash,
          blockNumber: mockBlockNumber,
          gasUsed: "145000",
        };
      };

      const payload = {
        batchId: "HC-TEST-BATCH-001",
        quantityGrams: 25000,
        floralOrigin: "Sundarbans Wild Mangrove",
        sourceHives: ["HIVE-S1", "HIVE-S2"],
        apiaryLocation: {
          latitude: 21.9497,
          longitude: 89.1833,
          region: "Sundarbans Biosphere Reserve",
        },
      };

      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send(payload);

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.batchId).to.equal("HC-TEST-BATCH-001");
      expect(res.body.data.status).to.equal("Registered");
      expect(res.body.data.blockchain.registrationConfirmed).to.be.true;
      expect(res.body.data.blockchain.registrationTxHash).to.equal(mockTxHash);
      expect(res.body.data.blockchain.registrationBlock).to.equal(mockBlockNumber);

      // Verify MongoDB persistence
      const saved = await Batch.findOne({ batchId: "HC-TEST-BATCH-001" });
      expect(saved).to.not.be.null;
      expect(saved?.quantityGrams).to.equal(25000);
      expect(saved?.metadataHash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("rejects batch registration with invalid quantity", async function () {
      const payload = {
        batchId: "HC-TEST-BATCH-INVALID",
        quantityGrams: 0,
        floralOrigin: "Sundarbans",
        apiaryLocation: { latitude: 21, longitude: 89, region: "Sundarbans" },
      };

      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send(payload);
      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("positive integer");
    });

    it("rejects batch registration missing apiary location", async function () {
      const payload = {
        batchId: "HC-TEST-BATCH-NOLOC",
        quantityGrams: 10000,
        floralOrigin: "Sundarbans",
      };

      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send(payload);
      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it("rejects duplicate batchId registration in MongoDB", async function () {
      blockchainService.registerBatch = async (batchId) => ({
        success: true,
        batchId,
        batchIdBytes32: blockchainService.formatBytes32BatchId(batchId),
        txHash: "0x123",
        blockNumber: 1,
        gasUsed: "1000",
      });

      const payload = {
        batchId: "HC-DUPLICATE-001",
        quantityGrams: 15000,
        floralOrigin: "Acacia",
        apiaryLocation: { latitude: 28, longitude: 77, region: "Kashmir" },
      };

      const res1 = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send(payload);
      expect(res1.status).to.equal(201);

      const res2 = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send(payload);
      expect(res2.status).to.equal(409);
      expect(res2.body.error.message).to.include("already exists");
    });

    it("maintains MongoDB consistency (rolls back draft record) if blockchain transaction fails", async function () {
      blockchainService.registerBatch = async () => {
        throw new AppError("Testnet RPC error: out of gas", 500);
      };

      const payload = {
        batchId: "HC-FAIL-CONSISTENCY-001",
        quantityGrams: 12000,
        floralOrigin: "Mustard Blossom",
        apiaryLocation: { latitude: 26, longitude: 80, region: "Punjab" },
      };

      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send(payload);
      expect(res.status).to.equal(500);

      // Verify MongoDB does not leave orphan unconfirmed document
      const doc = await Batch.findOne({ batchId: "HC-FAIL-CONSISTENCY-001" });
      expect(doc).to.be.null;
    });
  });

  describe("3. POST /api/batches/:batchId/quality (Quality Certification)", function () {
    beforeEach(async function () {
      // Seed a registered batch in Mongo
      const batch = new Batch({
        batchId: "HC-CERT-001",
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-CERT-001"),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        currentCustodian: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        quantityGrams: 20000,
        harvestTimestamp: 1725732000,
        floralOrigin: "Kashmir Acacia",
        apiaryLocation: { latitude: 34.08, longitude: 74.79, region: "Kashmir Valley" },
        metadata: { batchId: "HC-CERT-001", quantityGrams: 20000 },
        metadataHash: "0x" + "12".repeat(32),
        status: "Registered",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: blockchainService.contractAddress,
          registrationConfirmed: true,
          registrationTxHash: "0xreg123",
          registrationBlock: 100,
        },
      });
      await batch.save();
    });

    it("successfully certifies batch and updates MongoDB with grade and moisture", async function () {
      const mockCertTxHash = "0x" + "b2".repeat(32);

      blockchainService.certifyBatch = async (batchId, hash, grade, moisture) => ({
        success: true,
        batchId,
        batchIdBytes32: blockchainService.formatBytes32BatchId(batchId),
        txHash: mockCertTxHash,
        blockNumber: 11655710,
        gasUsed: "98000",
      });

      const res = await request(app)
        .post("/api/batches/HC-CERT-001/quality")
        .set("Authorization", `Bearer ${labToken}`)
        .send({
          grade: "GradeA",
          moisturePercentage: 17.5,
          labReportData: {
            spectrometry: "Pure unadulterated",
            hmfPpm: 12.4,
            diastaseNumber: 14.8,
          },
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.status).to.equal("Certified");
      expect(res.body.data.quality.grade).to.equal("GradeA");
      expect(res.body.data.quality.moisturePercentage).to.equal(17.5);
      expect(res.body.data.quality.txHash).to.equal(mockCertTxHash);

      const updated = await Batch.findOne({ batchId: "HC-CERT-001" });
      expect(updated?.status).to.equal("Certified");
      expect(updated?.quality.grade).to.equal("GradeA");
    });

    it("returns 404 if batch does not exist", async function () {
      const res = await request(app)
        .post("/api/batches/NON-EXISTENT/quality")
        .set("Authorization", `Bearer ${labToken}`)
        .send({ grade: "GradeA", moisturePercentage: 18.0 });

      expect(res.status).to.equal(404);
    });

    it("returns 400 for invalid quality grade", async function () {
      const res = await request(app)
        .post("/api/batches/HC-CERT-001/quality")
        .set("Authorization", `Bearer ${labToken}`)
        .send({ grade: "GradeSuperAwesome", moisturePercentage: 18.0 });

      expect(res.status).to.equal(400);
      expect(res.body.error.message).to.include("one of: GradeA, GradeB, GradeC, Substandard");
    });
  });

  describe("4. POST /api/batches/:batchId/transfer (Custody Transfer)", function () {
    beforeEach(async function () {
      const batch = new Batch({
        batchId: "HC-TRANSFER-001",
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-TRANSFER-001"),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        currentCustodian: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        quantityGrams: 30000,
        harvestTimestamp: 1725732000,
        floralOrigin: "Multifloral",
        apiaryLocation: { latitude: 22, longitude: 88, region: "West Bengal" },
        metadata: { batchId: "HC-TRANSFER-001" },
        metadataHash: "0x" + "33".repeat(32),
        status: "Certified",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: blockchainService.contractAddress,
          registrationConfirmed: true,
        },
      });
      await batch.save();
    });

    it("transfers custody to recipient and appends to custody chain", async function () {
      const mockTxHash = "0x" + "c3".repeat(32);
      const processorAddress = "0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34";

      blockchainService.transferCustody = async (batchId, to, loc, role) => ({
        success: true,
        batchId,
        batchIdBytes32: blockchainService.formatBytes32BatchId(batchId),
        txHash: mockTxHash,
        blockNumber: 11655720,
        gasUsed: "65000",
      });

      const res = await request(app)
        .post("/api/batches/HC-TRANSFER-001/transfer")
        .set("Authorization", `Bearer ${processorToken}`)
        .send({
          to: processorAddress,
          location: "Kolkata Processing Plant",
          role: "beekeeper",
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.currentCustodian).to.equal(processorAddress);
      expect(res.body.data.status).to.equal("InTransit");
      expect(res.body.data.custodyHistory.length).to.equal(1);
      expect(res.body.data.custodyHistory[0].location).to.equal("Kolkata Processing Plant");
    });
  });

  describe("5. POST /api/batches/:batchId/recall (Batch Recall)", function () {
    beforeEach(async function () {
      const batch = new Batch({
        batchId: "HC-RECALL-001",
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-RECALL-001"),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        currentCustodian: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        quantityGrams: 10000,
        harvestTimestamp: 1725732000,
        floralOrigin: "Wild Forest",
        apiaryLocation: { latitude: 20, longitude: 85, region: "Odisha" },
        metadata: { batchId: "HC-RECALL-001" },
        metadataHash: "0x" + "44".repeat(32),
        status: "Certified",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: blockchainService.contractAddress,
          registrationConfirmed: true,
        },
      });
      await batch.save();
    });

    it("recalls batch and records terminal recalled state", async function () {
      const mockTxHash = "0x" + "d4".repeat(32);

      blockchainService.recallBatch = async (batchId, reason, role) => ({
        success: true,
        batchId,
        batchIdBytes32: blockchainService.formatBytes32BatchId(batchId),
        txHash: mockTxHash,
        blockNumber: 11655730,
        gasUsed: "54000",
      });

      const res = await request(app)
        .post("/api/batches/HC-RECALL-001/recall")
        .set("Authorization", `Bearer ${auditorToken}`)
        .send({
          reason: "Trace antibiotic residue detected in secondary audit assay",
          role: "auditor",
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.status).to.equal("Recalled");
      expect(res.body.data.recall.recalled).to.be.true;
      expect(res.body.data.recall.reason).to.include("antibiotic residue");

      // Verify cannot recall again
      const resDuplicate = await request(app)
        .post("/api/batches/HC-RECALL-001/recall")
        .set("Authorization", `Bearer ${auditorToken}`)
        .send({ reason: "Repeat recall attempt" });
      expect(resDuplicate.status).to.equal(400);
    });
  });

  describe("6. GET /api/verify/:batchId (Consumer Verification & Tamper Detection)", function () {
    let canonicalMetadata: any;
    let expectedHash: string;

    beforeEach(async function () {
      canonicalMetadata = {
        batchId: "HC-VERIFY-001",
        quantityGrams: 28000,
        floralOrigin: "Sundarbans Wildflower",
        sourceHives: ["H-01", "H-02"],
        apiaryLocation: { latitude: 21.9, longitude: 89.1, region: "Sundarbans" },
        harvestTimestamp: 1725732000,
      };
      expectedHash = blockchainService.generateMetadataHash(canonicalMetadata);

      const batch = new Batch({
        batchId: "HC-VERIFY-001",
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-VERIFY-001"),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        currentCustodian: "0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34",
        quantityGrams: 28000,
        harvestTimestamp: 1725732000,
        floralOrigin: "Sundarbans Wildflower",
        sourceHives: ["H-01", "H-02"],
        apiaryLocation: { latitude: 21.9, longitude: 89.1, region: "Sundarbans" },
        metadata: canonicalMetadata,
        metadataHash: expectedHash,
        status: "InTransit",
        quality: {
          grade: "GradeA",
          moisturePercentage: 17.2,
          moistureBasisPoints: 1720,
          labReportHash: "0x" + "aa".repeat(32),
          certifiedBy: "0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c",
          certifiedAt: 1725740000,
        },
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: blockchainService.contractAddress,
          registrationConfirmed: true,
          registrationTxHash: "0xregTxHash123",
          registrationBlock: 11655688,
        },
      });
      await batch.save();
    });

    it("verifies untampered batch: metadata hash matches on-chain hash", async function () {
      // Mock on-chain response
      blockchainService.getBatch = async () => ({
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-VERIFY-001"),
        metadataHash: expectedHash,
        labReportHash: "0x" + "aa".repeat(32),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        harvestTimestamp: 1725732000,
        certifier: "0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c",
        certificationTimestamp: 1725740000,
        currentCustodian: "0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34",
        quantityGrams: 28000,
        moistureBasisPoints: 1720,
        moisturePercentage: 17.2,
        status: 2,
        statusName: "InTransit",
        qualityGrade: 1,
        qualityGradeName: "GradeA",
      });

      blockchainService.getBatchHistory = async () => [
        {
          stage: "Harvest & Batch Registration",
          eventType: "BatchRegistered",
          txHash: "0xregTxHash123",
          blockNumber: 11655688,
          timestamp: 1725732000,
          details: { quantityGrams: 28000 },
        },
        {
          stage: "Lab Quality Certification",
          eventType: "BatchCertified",
          txHash: "0xcertTxHash456",
          blockNumber: 11655700,
          timestamp: 1725740000,
          details: { qualityGrade: "GradeA", moisturePercentage: 17.2 },
        },
      ];

      const res = await request(app).get("/api/verify/HC-VERIFY-001");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.verifiedOnChain).to.be.true;
      expect(res.body.tamperProofAudit.integrityVerified).to.be.true;
      expect(res.body.tamperProofAudit.metadataHashMatch).to.be.true;
      expect(res.body.tamperProofAudit.labReportHashMatch).to.be.true;
      expect(res.body.blockchain.status).to.equal("InTransit");
      expect(res.body.quality.grade).to.equal("GradeA");
      expect(res.body.custodyTimeline.length).to.equal(2);
    });

    it("tamper detection: detects altered off-chain metadata when modified in MongoDB", async function () {
      // Simulate malicious tampering directly in the off-chain MongoDB record (e.g. altering floral origin or quantity)
      await Batch.updateOne(
        { batchId: "HC-VERIFY-001" },
        { $set: { "metadata.quantityGrams": 50000, "metadata.floralOrigin": "Fraudulent Origin" } }
      );

      // On-chain state still retains original authentic hash
      blockchainService.getBatch = async () => ({
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-VERIFY-001"),
        metadataHash: expectedHash,
        labReportHash: "0x" + "aa".repeat(32),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        harvestTimestamp: 1725732000,
        certifier: "0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c",
        certificationTimestamp: 1725740000,
        currentCustodian: "0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34",
        quantityGrams: 28000,
        moistureBasisPoints: 1720,
        moisturePercentage: 17.2,
        status: 2,
        statusName: "InTransit",
        qualityGrade: 1,
        qualityGradeName: "GradeA",
      });

      blockchainService.getBatchHistory = async () => [];

      const res = await request(app).get("/api/verify/HC-VERIFY-001");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.tamperProofAudit.integrityVerified).to.be.false;
      expect(res.body.tamperProofAudit.metadataHashMatch).to.be.false;
      expect(res.body.tamperProofAudit.offChainMetadataHash).to.not.equal(expectedHash);
      expect(res.body.tamperProofAudit.onChainMetadataHash).to.equal(expectedHash);
    });
  });
});
