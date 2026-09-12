import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { User, IUser } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import { Batch } from "../models/Batch.js";
import authService from "../services/auth.service.js";
import blockchainService from "../services/blockchain.service.js";
import { env } from "../config/env.js";

describe("HoneyChain Authentication & Role Authorization Test Suite", function () {
  this.timeout(25000);

  let mongoServer: MongoMemoryServer;
  let beekeeperUser: IUser;
  let labUser: IUser;
  let processorUser: IUser;
  let transporterUser: IUser;
  let auditorUser: IUser;
  let adminUser: IUser;
  let inactiveUser: IUser;

  let beekeeperToken: string;
  let labToken: string;
  let processorToken: string;
  let transporterToken: string;
  let auditorToken: string;
  let adminToken: string;

  const TEST_PASSWORD = "Password123!";

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    const passwordHash = await authService.hashPassword(TEST_PASSWORD);

    // Create Organizations
    const beekeeperOrg = await Organization.create({
      name: "Sundarbans Apiary Cooperative",
      role: "beekeeper",
      walletAddress: blockchainService.getWalletAddressForRole("beekeeper"),
    });

    const labOrg = await Organization.create({
      name: "National Honey Testing Lab",
      role: "lab",
      walletAddress: blockchainService.getWalletAddressForRole("lab"),
    });

    const auditorOrg = await Organization.create({
      name: "FSSAI Quality Audit",
      role: "auditor",
      walletAddress: blockchainService.getWalletAddressForRole("auditor"),
    });

    // Create Users for each major stakeholder role
    beekeeperUser = await User.create({
      name: "Rajesh Beekeeper",
      email: "beekeeper.test@honeychain.org",
      passwordHash,
      role: "beekeeper",
      organizationId: beekeeperOrg._id,
      isActive: true,
    });

    labUser = await User.create({
      name: "Dr. Sen Lab",
      email: "lab.test@honeychain.org",
      passwordHash,
      role: "lab",
      organizationId: labOrg._id,
      isActive: true,
    });

    processorUser = await User.create({
      name: "Vikram Processor",
      email: "processor.test@honeychain.org",
      passwordHash,
      role: "processor",
      isActive: true,
    });

    transporterUser = await User.create({
      name: "Gurpreet Transporter",
      email: "transporter.test@honeychain.org",
      passwordHash,
      role: "transporter",
      isActive: true,
    });

    auditorUser = await User.create({
      name: "Priya Auditor",
      email: "auditor.test@honeychain.org",
      passwordHash,
      role: "auditor",
      organizationId: auditorOrg._id,
      isActive: true,
    });

    adminUser = await User.create({
      name: "Root Admin",
      email: "admin.test@honeychain.org",
      passwordHash,
      role: "admin",
      isActive: true,
    });

    inactiveUser = await User.create({
      name: "Inactive User",
      email: "inactive.test@honeychain.org",
      passwordHash,
      role: "beekeeper",
      isActive: false,
    });

    // Generate tokens
    beekeeperToken = authService.generateToken(beekeeperUser);
    labToken = authService.generateToken(labUser);
    processorToken = authService.generateToken(processorUser);
    transporterToken = authService.generateToken(transporterUser);
    auditorToken = authService.generateToken(auditorUser);
    adminToken = authService.generateToken(adminUser);
  });

  after(async function () {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("1. Authentication (POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout)", function () {
    it("valid login succeeds with correct credentials and returns JWT token and user info", async function () {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "beekeeper.test@honeychain.org",
          password: TEST_PASSWORD,
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.token).to.be.a("string");
      expect(res.body.user).to.have.property("email", "beekeeper.test@honeychain.org");
      expect(res.body.user).to.have.property("role", "beekeeper");
      expect(res.body.user).to.have.property("walletAddress");
      expect(res.body.user.passwordHash).to.be.undefined;
    });

    it("rejects login with invalid password (401)", async function () {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "beekeeper.test@honeychain.org",
          password: "WrongPassword!",
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Invalid email or password");
    });

    it("rejects login with unknown email (401)", async function () {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@honeychain.org",
          password: TEST_PASSWORD,
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Invalid email or password");
    });

    it("rejects login for deactivated/inactive user (401)", async function () {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "inactive.test@honeychain.org",
          password: TEST_PASSWORD,
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("deactivated");
    });

    it("GET /api/auth/me returns current user profile when valid Bearer token is supplied", async function () {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${beekeeperToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.user.email).to.equal("beekeeper.test@honeychain.org");
      expect(res.body.user.role).to.equal("beekeeper");
      expect(res.body.user.walletAddress).to.equal(blockchainService.getWalletAddressForRole("beekeeper"));
    });

    it("GET /api/auth/me rejects request when Authorization header is missing (401)", async function () {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Authentication required");
    });

    it("GET /api/auth/me rejects expired or tampered JWT token (401)", async function () {
      const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload";
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${invalidToken}`);

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Invalid authentication token");
    });

    it("POST /api/auth/logout clears session cookies and returns success", async function () {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include("Logged out");
    });
  });

  describe("2. Admin-Only User Management (POST /api/auth/users)", function () {
    it("allows admin user to create a new user account (201)", async function () {
      const res = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Lab Analyst",
          email: "newlab@honeychain.org",
          password: "SecurePassword123!",
          role: "lab",
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.email).to.equal("newlab@honeychain.org");
      expect(res.body.data.role).to.equal("lab");
      expect(res.body.data.passwordHash).to.be.undefined;
    });

    it("rejects non-admin users from creating new user accounts (403 Forbidden)", async function () {
      const res = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send({
          name: "Attacker User",
          email: "attacker@honeychain.org",
          password: "SecurePassword123!",
          role: "admin",
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Access forbidden");
    });

    it("rejects unauthenticated requests to create users (401 Unauthorized)", async function () {
      const res = await request(app)
        .post("/api/auth/users")
        .send({
          name: "Anonymous User",
          email: "anon@honeychain.org",
          password: "SecurePassword123!",
          role: "beekeeper",
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });
  });

  describe("3. Role-Based Endpoint Authorization & Rejection", function () {
    beforeEach(async function () {
      await Batch.deleteMany({});
    });

    it("rejects unauthenticated requests to POST /api/batches with 401 Unauthorized", async function () {
      const res = await request(app)
        .post("/api/batches")
        .send({
          quantityGrams: 20000,
          floralOrigin: "Acacia",
          apiaryLocation: { latitude: 22, longitude: 88, region: "Bengal" },
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Authentication required");
    });

    it("rejects non-beekeeper roles (e.g. Lab, Auditor) from POST /api/batches with 403 Forbidden", async function () {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${labToken}`)
        .send({
          quantityGrams: 20000,
          floralOrigin: "Acacia",
          apiaryLocation: { latitude: 22, longitude: 88, region: "Bengal" },
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Access forbidden");
      expect(res.body.error.message).to.include("beekeeper");
    });

    it("rejects non-lab roles (e.g. Beekeeper) from POST /api/batches/:id/quality with 403 Forbidden", async function () {
      const res = await request(app)
        .post("/api/batches/HC-TEST-BATCH/quality")
        .set("Authorization", `Bearer ${beekeeperToken}`)
        .send({
          grade: "GradeA",
          moisturePercentage: 17.5,
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Access forbidden");
      expect(res.body.error.message).to.include("lab");
    });

    it("rejects non-auditor roles (e.g. Processor) from POST /api/batches/:id/recall with 403 Forbidden", async function () {
      const res = await request(app)
        .post("/api/batches/HC-TEST-BATCH/recall")
        .set("Authorization", `Bearer ${processorToken}`)
        .send({
          reason: "Suspected adulteration",
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Access forbidden");
      expect(res.body.error.message).to.include("auditor");
    });

    it("enforces Processor role for packaging QR generation GET /api/batches/:id/qr and keeps /verify/:id public", async function () {
      // Create a batch first
      await Batch.create({
        batchId: "HC-PUBLIC-QR-TEST",
        batchIdBytes32: blockchainService.formatBytes32BatchId("HC-PUBLIC-QR-TEST"),
        producer: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        currentCustodian: "0x111748e2D54D3f151746Af8B508CE8AD626d7A93",
        quantityGrams: 20000,
        harvestTimestamp: Math.floor(Date.now() / 1000),
        floralOrigin: "Wild Forest",
        apiaryLocation: { latitude: 22, longitude: 88, region: "Bengal" },
        metadata: { batchId: "HC-PUBLIC-QR-TEST" },
        metadataHash: "0x" + "11".repeat(32),
        status: "Registered",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: env.CONTRACT_ADDRESS,
          registrationConfirmed: true,
        },
      });

      // 1. Unauthenticated caller is rejected with 401
      const unauthRes = await request(app).get("/api/batches/HC-PUBLIC-QR-TEST/qr");
      expect(unauthRes.status).to.equal(401);

      // 2. Stakeholders (e.g. beekeeper and processor) can generate QR with 200 OK
      const beekeeperRes = await request(app)
        .get("/api/batches/HC-PUBLIC-QR-TEST/qr")
        .set("Authorization", `Bearer ${beekeeperToken}`);
      expect(beekeeperRes.status).to.equal(200);
      expect(beekeeperRes.body.success).to.be.true;

      // 3. Processor generates QR code with 200 OK
      const procRes = await request(app)
        .get("/api/batches/HC-PUBLIC-QR-TEST/qr")
        .set("Authorization", `Bearer ${processorToken}`);
      expect(procRes.status).to.equal(200);
      expect(procRes.body.success).to.be.true;
      expect(procRes.body).to.have.property("dataUrl");
      expect(procRes.body).to.have.property("verificationUrl");

      // 4. Consumer verification route remains public without auth
      const verifyRes = await request(app).get("/verify/HC-PUBLIC-QR-TEST");
      expect(verifyRes.status).to.equal(200);
    });
  });

  describe("4. Blockchain Wallet Identity Resolution", function () {
    it("returns all 5 stakeholder wallet addresses from GET /api/auth/wallets", async function () {
      const res = await request(app).get("/api/auth/wallets");
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.wallets).to.have.property("beekeeper");
      expect(res.body.wallets).to.have.property("lab");
      expect(res.body.wallets).to.have.property("processor");
      expect(res.body.wallets).to.have.property("transporter");
      expect(res.body.wallets).to.have.property("auditor");
    });

    it("verifies beekeeper user automatically binds to beekeeper wallet", async function () {
      const address = blockchainService.getWalletAddressForRole("beekeeper");
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(beekeeperUser.role).to.equal("beekeeper");
    });

    it("verifies lab user automatically binds to laboratory wallet", async function () {
      const address = blockchainService.getWalletAddressForRole("lab");
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(labUser.role).to.equal("lab");
    });

    it("verifies auditor user automatically binds to auditor wallet", async function () {
      const address = blockchainService.getWalletAddressForRole("auditor");
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(auditorUser.role).to.equal("auditor");
    });
  });
});
