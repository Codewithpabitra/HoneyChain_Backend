import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { Batch } from "../models/Batch.js";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import authService from "../services/auth.service.js";
import qrService from "../services/qr.service.js";
import { env } from "../config/env.js";

describe("HoneyChain Consumer QR Verification & Service Test Suite", function () {
  this.timeout(20000);

  let mongoServer: MongoMemoryServer;
  let processorToken: string;
  let beekeeperToken: string;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    const procOrg = await Organization.create({
      name: "Acme Processing Co",
      role: "processor",
      walletAddress: "0x7777777777777777777777777777777777777777",
      status: "active",
      isActive: true,
    });

    const procUser = await User.create({
      name: "Paul Processor",
      email: "processor@acme.com",
      passwordHash: "hash123",
      role: "processor",
      organizationId: procOrg._id,
      isActive: true,
    });
    processorToken = authService.generateToken(procUser);

    const beeOrg = await Organization.create({
      name: "Bee Union",
      role: "beekeeper",
      walletAddress: "0x8888888888888888888888888888888888888888",
      status: "active",
      isActive: true,
    });

    const beeUser = await User.create({
      name: "Ben Beekeeper",
      email: "ben@beeunion.com",
      passwordHash: "hash123",
      role: "beekeeper",
      organizationId: beeOrg._id,
      isActive: true,
    });
    beekeeperToken = authService.generateToken(beeUser);
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    await Batch.deleteMany({});
  });

  describe("1. QR Service Unit Tests", function () {
    it("generateVerificationUrl strips trailing slashes from base URL", function () {
      const url1 = qrService.generateVerificationUrl(
        "HC-BATCH-100",
        "https://example-render-app.onrender.com/"
      );
      expect(url1).to.equal(
        "https://example-render-app.onrender.com/verify/HC-BATCH-100"
      );

      const url2 = qrService.generateVerificationUrl(
        "HC-BATCH-200",
        "http://localhost:5000///"
      );
      expect(url2).to.equal("http://localhost:5000/verify/HC-BATCH-200");
    });

    it("generateVerificationUrl encodes URL parameters safely", function () {
      const url = qrService.generateVerificationUrl(
        "HC BATCH #001",
        "https://honeychain.org"
      );
      expect(url).to.equal(
        "https://honeychain.org/verify/HC%20BATCH%20%23001"
      );
    });

    it("throws a descriptive error when batchId is invalid or empty", function () {
      expect(() => qrService.generateVerificationUrl("")).to.throw(
        /Invalid batchId/
      );
      expect(() => qrService.generateVerificationUrl("   ")).to.throw(
        /Invalid batchId/
      );
    });

    it("throws a descriptive error when PUBLIC_BASE_URL is not configured", function () {
      const savedEnv = env.PUBLIC_BASE_URL;
      const savedProc = process.env.PUBLIC_BASE_URL;

      try {
        delete (env as any).PUBLIC_BASE_URL;
        delete process.env.PUBLIC_BASE_URL;

        expect(() => qrService.getPublicBaseUrl()).to.throw(
          /PUBLIC_BASE_URL is not configured/
        );
      } finally {
        (env as any).PUBLIC_BASE_URL = savedEnv;
        if (savedProc !== undefined) {
          process.env.PUBLIC_BASE_URL = savedProc;
        }
      }
    });

    it("generateQrCode returns valid base64 PNG data URL and SVG markup", async function () {
      const result = await qrService.generateQrCode(
        "HC-BATCH-TEST-QR",
        "https://honeychain.test"
      );

      expect(result).to.have.property("verificationUrl");
      expect(result.verificationUrl).to.equal(
        "https://honeychain.test/verify/HC-BATCH-TEST-QR"
      );

      expect(result).to.have.property("dataUrl");
      expect(result.dataUrl).to.match(/^data:image\/png;base64,/);

      expect(result).to.have.property("svg");
      expect(result.svg).to.include("<svg");
      expect(result.svg).to.include("</svg>");
    });
  });

  describe("2. GET /api/batches/:batchId/qr (Packaging QR Access Control)", function () {
    const seedBatch = async () => {
      return Batch.create({
        batchId: "HC-BATCH-QR-VALID",
        batchIdBytes32:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        producer: "0x1111111111111111111111111111111111111111",
        currentCustodian: "0x1111111111111111111111111111111111111111",
        quantityGrams: 5000,
        harvestTimestamp: 1700000000,
        metadata: {
          batchId: "HC-BATCH-QR-VALID",
          quantityGrams: 5000,
          floralOrigin: "Sundarbans Wild Mangrove",
          sourceHives: ["HIVE-SB-101"],
          apiaryLocation: {
            latitude: 21.9497,
            longitude: 89.1833,
            region: "Sundarbans Sanctuary",
          },
          harvestTimestamp: 1700000000,
        },
        metadataHash:
          "0x2222222222222222222222222222222222222222222222222222222222222222",
        floralOrigin: "Sundarbans Wild Mangrove",
        sourceHives: ["HIVE-SB-101"],
        apiaryLocation: {
          latitude: 21.9497,
          longitude: 89.1833,
          region: "Sundarbans Sanctuary",
        },
        quality: {
          grade: "GradeA",
          moisturePercentage: 17.5,
          certifiedBy: "0x3333333333333333333333333333333333333333",
          labReportHash:
            "0x4444444444444444444444444444444444444444444444444444444444444444",
          labReportUrl: "https://res.cloudinary.com/demo/raw/upload/HoneyChain/lab-certificates/HC-BATCH-QR-VALID/report.pdf",
          certifiedAt: 1700001000,
        },
        custodyChain: [],
        status: "Certified",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: "0x65afF3B44441FfF68171a9a0AA28063BC83C208d",
          registrationConfirmed: true,
          registrationTxHash:
            "0x5555555555555555555555555555555555555555555555555555555555555555",
        },
      });
    };

    it("rejects unauthenticated request with 401 Unauthorized", async function () {
      await seedBatch();

      const res = await request(app)
        .get("/api/batches/HC-BATCH-QR-VALID/qr")
        .expect(401);

      expect(res.body).to.have.property("success", false);
      expect(res.body.error?.message || res.body.message).to.include("Authentication required");
    });

    it("rejects unauthorized non-processor role (e.g. beekeeper) with 403 Forbidden", async function () {
      await seedBatch();

      const res = await request(app)
        .get("/api/batches/HC-BATCH-QR-VALID/qr")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .expect(403);

      expect(res.body).to.have.property("success", false);
      expect(res.body.error?.message || res.body.message).to.include("not authorized");
    });

    it("allows Processor role to generate packaging QR code (200 OK)", async function () {
      await seedBatch();

      const res = await request(app)
        .get("/api/batches/HC-BATCH-QR-VALID/qr")
        .set("Authorization", `Bearer ${processorToken}`)
        .expect(200);

      expect(res.body).to.have.property("success", true);
      expect(res.body).to.have.property("batchId", "HC-BATCH-QR-VALID");
      expect(res.body).to.have.property("verificationUrl");
      expect(res.body.verificationUrl).to.include(
        "/verify/HC-BATCH-QR-VALID"
      );
      expect(res.body).to.have.property("dataUrl");
      expect(res.body.dataUrl).to.match(/^data:image\/png;base64,/);
      expect(res.body).to.have.property("svg");
      expect(res.body.svg).to.include("<svg");
    });

    it("returns 404 Not Found when Processor requests QR for a nonexistent batch", async function () {
      const res = await request(app)
        .get("/api/batches/NONEXISTENT-BATCH/qr")
        .set("Authorization", `Bearer ${processorToken}`)
        .expect(404);

      expect(res.body).to.have.property("success", false);
      expect(res.body.error?.message || res.body.message).to.include(
        "not found"
      );
    });
  });

  describe("3. GET /verify/:batchId (Consumer Verification Web Route)", function () {
    it("serves consumer verification HTML page for /verify/:batchId with View Lab Report button", async function () {
      await Batch.create({
        batchId: "HC-DEMO-168666",
        batchIdBytes32:
          "0x3333333333333333333333333333333333333333333333333333333333333333",
        producer: "0x1111111111111111111111111111111111111111",
        currentCustodian: "0x1111111111111111111111111111111111111111",
        quantityGrams: 3000,
        harvestTimestamp: 1700000000,
        metadata: { batchId: "HC-DEMO-168666" },
        metadataHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
        floralOrigin: "Mustard Blossom",
        sourceHives: ["HIVE-1"],
        apiaryLocation: { latitude: 22, longitude: 88, region: "Bengal" },
        quality: {
          grade: "GradeA",
          moisturePercentage: 16.8,
          labReportHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
          labReportUrl: "https://res.cloudinary.com/ddhhqxnbm/raw/upload/v1234/HoneyChain/lab-certificates/HC-DEMO-168666/assay.pdf",
        },
        status: "Certified",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: "0x65afF3B44441FfF68171a9a0AA28063BC83C208d",
        },
      });

      const res = await request(app)
        .get("/verify/HC-DEMO-168666")
        .expect(200);

      expect(res.headers["content-type"]).to.include("text/html");
      expect(res.text).to.include("HoneyChain");
      expect(res.text).to.include("verifyDisplayArea");
      expect(res.text).to.include("View Lab Report");
      expect(res.text).to.include("https://res.cloudinary.com/ddhhqxnbm/raw/upload/v1234/HoneyChain/lab-certificates/HC-DEMO-168666/assay.pdf");
      expect(res.text).to.include("viewLabReportBtn");
    });

    it("serves consumer verification HTML page for /verify without batchId", async function () {
      const res = await request(app)
        .get("/verify")
        .expect(200);

      expect(res.headers["content-type"]).to.include("text/html");
      expect(res.text).to.include("HoneyChain");
    });
  });
});
