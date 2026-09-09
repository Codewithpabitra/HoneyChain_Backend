import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { User, IUser } from "../models/User.js";
import { Organization, IOrganization } from "../models/Organization.js";
import { OrganizationApplication } from "../models/OrganizationApplication.js";
import authService from "../services/auth.service.js";
import blockchainService from "../services/blockchain.service.js";

describe("HoneyChain Organization-Based Onboarding & Multi-Tenant RBAC Test Suite", function () {
  this.timeout(25000);

  let mongoServer: MongoMemoryServer;

  // Users & Tokens
  let systemAdminUser: IUser;
  let systemAdminToken: string;

  let existingBeekeeperOrg: IOrganization;
  let existingBeekeeperAdminUser: IUser;
  let existingBeekeeperAdminToken: string;

  let existingBeekeeperMemberUser: IUser;
  let existingBeekeeperMemberToken: string;

  const ADMIN_PASSWORD = "SystemAdminPassword123!";
  const BEEKEEPER_PASSWORD = "BeekeeperPassword123!";

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);

    // 1. Seed System Admin
    const adminPasswordHash = await authService.hashPassword(ADMIN_PASSWORD);
    systemAdminUser = await User.create({
      name: "HoneyChain Root Admin",
      email: "rootadmin@honeychain.org",
      passwordHash: adminPasswordHash,
      role: "admin",
      isOrgAdmin: false,
      isActive: true,
    });
    systemAdminToken = authService.generateToken(systemAdminUser);

    // 2. Seed an existing Beekeeper Organization
    existingBeekeeperOrg = await Organization.create({
      name: "Sundarbans Apiary Cooperative",
      role: "beekeeper",
      walletAddress: blockchainService.getWalletAddressForRole("beekeeper"),
      isActive: true,
      status: "active",
    });

    const beekeeperPasswordHash = await authService.hashPassword(BEEKEEPER_PASSWORD);

    // Seed Org Admin for Beekeeper Org
    existingBeekeeperAdminUser = await User.create({
      name: "Rajesh Org Admin",
      email: "rajesh.admin@sundarbans.org",
      passwordHash: beekeeperPasswordHash,
      role: "beekeeper",
      organizationId: existingBeekeeperOrg._id,
      isOrgAdmin: true,
      isActive: true,
    });
    existingBeekeeperOrg.adminUserId = existingBeekeeperAdminUser._id;
    await existingBeekeeperOrg.save();
    existingBeekeeperAdminToken = authService.generateToken(existingBeekeeperAdminUser);

    // Seed Regular Member for Beekeeper Org
    existingBeekeeperMemberUser = await User.create({
      name: "Amit Beekeeper Member",
      email: "amit.member@sundarbans.org",
      passwordHash: beekeeperPasswordHash,
      role: "beekeeper",
      organizationId: existingBeekeeperOrg._id,
      isOrgAdmin: false,
      isActive: true,
    });
    existingBeekeeperMemberToken = authService.generateToken(existingBeekeeperMemberUser);
  });

  after(async function () {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // ==========================================================================
  // 1. PUBLIC ONBOARDING APPLICATION SUBMISSION
  // ==========================================================================
  describe("1. Public Organization Application Flow (POST /api/organizations/apply)", function () {
    let createdAppId: string;

    it("successfully submits a valid organization application with status PENDING without password", async function () {
      const res = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: "Kashmir Valley Apiaries Ltd",
          organizationType: "beekeeper",
          registrationNumber: "KV-AP-2026-991",
          contactEmail: "contact@kashmirapiary.com",
          contactPhone: "+91 94190 12345",
          address: "Srinagar Orchard Estate, J&K",
          adminName: "Ghulam Hassan",
          adminEmail: "ghulam.hassan@kashmirapiary.com",
          documents: [
            {
              name: "Cooperative_License.pdf",
              url: "https://storage.honeychain.org/docs/license.pdf",
              fileType: "application/pdf",
            },
          ],
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property("applicationId");
      expect(res.body.data.organizationName).to.equal("Kashmir Valley Apiaries Ltd");
      expect(res.body.data.organizationType).to.equal("beekeeper");
      expect(res.body.data.role).to.equal("beekeeper");
      expect(res.body.data.status).to.equal("PENDING");
      expect(res.body.data.adminPasswordHash).to.be.undefined;
      expect(res.body.data.documents).to.have.lengthOf(1);

      createdAppId = res.body.data.applicationId;
    });

    it("rejects public application attempting to register as platform 'admin' (400)", async function () {
      const res = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: "Malicious Admin Org",
          organizationType: "admin",
          contactEmail: "admin@fakeorg.com",
          adminName: "Attacker",
          adminEmail: "attacker@fakeorg.com",
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.match(/Invalid organization (type|role)/);
    });

    it("rejects application when required fields are missing (400)", async function () {
      const res = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: "",
          organizationType: "lab",
          adminEmail: "lab@incomplete.com",
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it("rejects duplicate application when pending application already exists for email/name (409)", async function () {
      const res = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: "Kashmir Valley Apiaries Ltd",
          organizationType: "beekeeper",
          contactEmail: "dup@kashmirapiary.com",
          adminName: "Ghulam Hassan",
          adminEmail: "ghulam.hassan@kashmirapiary.com",
        });

      expect(res.status).to.equal(409);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("pending application");
    });

    it("rejects application when adminEmail belongs to an existing user (409)", async function () {
      const res = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: "Brand New Org",
          organizationType: "lab",
          contactEmail: "info@brandnew.com",
          adminName: "Rajesh Duplicate",
          adminEmail: "rajesh.admin@sundarbans.org", // already belongs to existing user
        });

      expect(res.status).to.equal(409);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("already exists");
    });

    it("POST /api/organizations/upload-doc attaches a valid PDF file to a pending application (201)", async function () {
      // Minimal valid PDF header magic bytes %PDF-1.4
      const samplePdfBase64 = Buffer.from("%PDF-1.4\n%Fake PDF content for test").toString("base64");

      const res = await request(app)
        .post("/api/organizations/upload-doc")
        .send({
          applicationId: createdAppId,
          fileName: "FSSAI_NABL_Certificate.pdf",
          fileData: samplePdfBase64,
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.document).to.have.property("url");
      expect(res.body.document.url).to.include("/uploads/doc-");
      expect(res.body.document.fileType).to.equal("application/pdf");
      expect(res.body.applicationId).to.equal(createdAppId);
    });

    it("POST /api/organizations/upload-doc rejects upload without applicationId (400)", async function () {
      const samplePdfBase64 = Buffer.from("%PDF-1.4\n%Fake PDF content for test").toString("base64");

      const res = await request(app)
        .post("/api/organizations/upload-doc")
        .send({
          fileName: "FSSAI_NABL_Certificate.pdf",
          fileData: samplePdfBase64,
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("applicationId is required");
    });

    it("POST /api/organizations/upload-doc rejects upload with non-existent applicationId (404)", async function () {
      const samplePdfBase64 = Buffer.from("%PDF-1.4\n%Fake PDF content for test").toString("base64");

      const res = await request(app)
        .post("/api/organizations/upload-doc")
        .send({
          applicationId: "APP-NONEXISTENT",
          fileName: "FSSAI_NABL_Certificate.pdf",
          fileData: samplePdfBase64,
        });

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Organization application not found");
    });

    it("POST /api/organizations/upload-doc rejects non-PDF file content (400)", async function () {
      const nonPdfBase64 = Buffer.from("NOT A PDF FILE CONTENT").toString("base64");

      const res = await request(app)
        .post("/api/organizations/upload-doc")
        .send({
          applicationId: createdAppId,
          fileName: "malicious_script.sh",
          fileData: nonPdfBase64,
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Only PDF documents are accepted");
    });
  });

  // ==========================================================================
  // 2. HONEYCHAIN ADMIN APPLICATION REVIEW & RBAC SECURITY
  // ==========================================================================
  describe("2. Admin Application Review & Security Authorization", function () {
    it("rejects unauthenticated requests to GET /api/organizations/applications (401)", async function () {
      const res = await request(app).get("/api/organizations/applications");
      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });

    it("rejects non-admin users (e.g. Beekeeper Org Admin) from viewing applications (403)", async function () {
      const res = await request(app)
        .get("/api/organizations/applications")
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`);

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Access forbidden");
    });

    it("HoneyChain Admin can list all applications (200)", async function () {
      const res = await request(app)
        .get("/api/organizations/applications?status=PENDING")
        .set("Authorization", `Bearer ${systemAdminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an("array");
      expect(res.body.data.length).to.be.at.least(1);
      expect(res.body.pagination).to.have.property("total");
    });
  });

  // ==========================================================================
  // 3. APPLICATION APPROVAL LIFECYCLE & BLOCKCHAIN WALLET ASSIGNMENT
  // ==========================================================================
  describe("3. Application Approval Lifecycle", function () {
    let pendingAppId: string;

    beforeEach(async function () {
      // Create a fresh pending application
      const appDoc = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: `Apex Quality Lab ${Date.now()}`,
          organizationType: "lab",
          contactEmail: `contact_${Date.now()}@apexlab.org`,
          adminName: "Dr. K. Sharma",
          adminEmail: `drsharma_${Date.now()}@apexlab.org`,
        });
      pendingAppId = appDoc.body.data.applicationId;
    });

    it("rejects non-admin user attempting to approve application (403)", async function () {
      const res = await request(app)
        .post(`/api/organizations/applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`);

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
    });

    it("HoneyChain Admin approves application: creates Org with unique wallet, provisions unactivated Org Admin with activation token (200)", async function () {
      const res = await request(app)
        .post(`/api/organizations/applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${systemAdminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property("organization");
      expect(res.body.data).to.have.property("adminUser");
      expect(res.body.data).to.have.property("activationToken");
      expect(res.body.data.application.status).to.equal("APPROVED");
      expect(res.body.data.activationToken).to.be.a("string");

      // Verify Organization state
      const org = res.body.data.organization;
      expect(org.status).to.equal("active");
      expect(org.isActive).to.be.true;
      expect(org.walletAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(org.encryptedPrivateKey).to.be.undefined; // Encrypted private key is never returned

      // Verify Org Admin User state
      const adminUser = res.body.data.adminUser;
      expect(adminUser.role).to.equal("lab");
      expect(adminUser.isOrgAdmin).to.be.true;
      expect(adminUser.isActive).to.be.false; // Not activated yet

      // Verify unactivated Org Admin CANNOT log in before activating
      const loginBeforeRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: adminUser.email,
          password: "LabPassword123!",
        });
      expect(loginBeforeRes.status).to.equal(401);

      // Org Admin activates account using activation token
      const activateRes = await request(app)
        .post("/api/auth/activate")
        .send({
          token: res.body.data.activationToken,
          password: "LabPassword123!",
        });

      expect(activateRes.status).to.equal(200);
      expect(activateRes.body.success).to.be.true;
      expect(activateRes.body.token).to.be.a("string");
      expect(activateRes.body.user.isActive).to.be.true;

      // Verify the new Org Admin can now log in with their set password!
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: adminUser.email,
          password: "LabPassword123!",
        });

      expect(loginRes.status).to.equal(200);
      expect(loginRes.body.success).to.be.true;
      expect(loginRes.body.token).to.be.a("string");
      expect(loginRes.body.user.isOrgAdmin).to.be.true;

      // Verify activation token cannot be reused
      const secondActivateRes = await request(app)
        .post("/api/auth/activate")
        .send({
          token: res.body.data.activationToken,
          password: "AnotherPassword123!",
        });

      expect(secondActivateRes.status).to.equal(400);
      expect(secondActivateRes.body.error.message).to.include("Invalid or expired activation token");
    });

    it("assigns unique blockchain wallet identities to two approved organizations of the same role (lab)", async function () {
      const app1 = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: `Alpha Lab ${Date.now()}`,
          organizationType: "lab",
          contactEmail: `alpha_${Date.now()}@alphalab.org`,
          adminName: "Dr. Alpha",
          adminEmail: `alpha_${Date.now()}@alphalab.org`,
        });

      const app2 = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: `Beta Lab ${Date.now()}`,
          organizationType: "lab",
          contactEmail: `beta_${Date.now()}@betalab.org`,
          adminName: "Dr. Beta",
          adminEmail: `beta_${Date.now()}@betalab.org`,
        });

      const res1 = await request(app)
        .post(`/api/organizations/applications/${app1.body.data.applicationId}/approve`)
        .set("Authorization", `Bearer ${systemAdminToken}`);

      const res2 = await request(app)
        .post(`/api/organizations/applications/${app2.body.data.applicationId}/approve`)
        .set("Authorization", `Bearer ${systemAdminToken}`);

      const wallet1 = res1.body.data.organization.walletAddress;
      const wallet2 = res2.body.data.organization.walletAddress;

      expect(wallet1).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet2).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet1.toLowerCase()).to.not.equal(wallet2.toLowerCase());
      expect(wallet1.toLowerCase()).to.not.equal(blockchainService.getWalletAddressForRole("lab").toLowerCase());
      expect(wallet2.toLowerCase()).to.not.equal(blockchainService.getWalletAddressForRole("lab").toLowerCase());
    });

    it("rejects duplicate approval on already approved application (400)", async function () {
      // First approval
      await request(app)
        .post(`/api/organizations/applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${systemAdminToken}`);

      // Second approval attempt
      const res = await request(app)
        .post(`/api/organizations/applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${systemAdminToken}`);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("already been processed");
    });
  });

  // ==========================================================================
  // 4. APPLICATION REJECTION LIFECYCLE
  // ==========================================================================
  describe("4. Application Rejection Lifecycle", function () {
    let rejectAppId: string;

    beforeEach(async function () {
      const appDoc = await request(app)
        .post("/api/organizations/apply")
        .send({
          organizationName: `Unlicensed Logistics ${Date.now()}`,
          organizationType: "transporter",
          contactEmail: `trans_${Date.now()}@unlicensed.org`,
          adminName: "Harpreet Singh",
          adminEmail: `harpreet_${Date.now()}@unlicensed.org`,
        });
      rejectAppId = appDoc.body.data.applicationId;
    });

    it("rejects rejection request missing a reason (400)", async function () {
      const res = await request(app)
        .post(`/api/organizations/applications/${rejectAppId}/reject`)
        .set("Authorization", `Bearer ${systemAdminToken}`)
        .send({ reason: "" });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("rejection reason is required");
    });

    it("HoneyChain Admin rejects application with reason (200)", async function () {
      const res = await request(app)
        .post(`/api/organizations/applications/${rejectAppId}/reject`)
        .set("Authorization", `Bearer ${systemAdminToken}`)
        .send({ reason: "Incomplete cold-chain transit documentation" });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.status).to.equal("REJECTED");
      expect(res.body.data.rejectionReason).to.equal("Incomplete cold-chain transit documentation");
      expect(res.body.data).to.have.property("rejectedBy");
      expect(res.body.data).to.have.property("rejectedAt");
    });

    it("cannot approve an already rejected application (400)", async function () {
      await request(app)
        .post(`/api/organizations/applications/${rejectAppId}/reject`)
        .set("Authorization", `Bearer ${systemAdminToken}`)
        .send({ reason: "Regulatory violation" });

      const res = await request(app)
        .post(`/api/organizations/applications/${rejectAppId}/approve`)
        .set("Authorization", `Bearer ${systemAdminToken}`);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("already been processed");
    });
  });

  // ==========================================================================
  // 5. TENANT ISOLATION & ORGANIZATION MEMBER MANAGEMENT
  // ==========================================================================
  describe("5. Tenant Isolation & Member Management", function () {
    let otherOrg: IOrganization;
    let otherOrgAdmin: IUser;
    let otherOrgAdminToken: string;

    before(async function () {
      otherOrg = await Organization.create({
        name: "Western Ghats Honey Processors",
        role: "processor",
        walletAddress: blockchainService.getWalletAddressForRole("processor"),
        isActive: true,
        status: "active",
      });

      const pwdHash = await authService.hashPassword("Password123!");
      otherOrgAdmin = await User.create({
        name: "Processor Org Admin",
        email: "admin@westernghatsproc.org",
        passwordHash: pwdHash,
        role: "processor",
        organizationId: otherOrg._id,
        isOrgAdmin: true,
        isActive: true,
      });
      otherOrgAdminToken = authService.generateToken(otherOrgAdmin);
    });

    it("Org Admin can view their own organization profile (GET /api/organizations/my)", async function () {
      const res = await request(app)
        .get("/api/organizations/my")
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.organization.name).to.equal("Sundarbans Apiary Cooperative");
      expect(res.body.data.members).to.be.an("array");
    });

    it("Org Admin can list members of their own organization (GET /api/organizations/my/members)", async function () {
      const res = await request(app)
        .get("/api/organizations/my/members")
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an("array");
      expect(res.body.data.length).to.be.at.least(2); // admin + member
    });

    it("Org Admin can add a new member to their own organization (POST /api/organizations/my/members)", async function () {
      const res = await request(app)
        .post("/api/organizations/my/members")
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`)
        .send({
          name: "Suresh Field Beekeeper",
          email: `suresh_${Date.now()}@sundarbans.org`,
          password: "SecurePassword123!",
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.organizationId).to.equal(existingBeekeeperOrg._id.toString());
      expect(res.body.data.role).to.equal("beekeeper");
      expect(res.body.data.isOrgAdmin).to.be.false;
    });

    it("TENANT ISOLATION: Org Admin CANNOT create a member for another organization", async function () {
      const res = await request(app)
        .post("/api/organizations/my/members")
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`)
        .send({
          name: "Hacker Member",
          email: `hacker_${Date.now()}@evil.org`,
          password: "SecurePassword123!",
          organizationId: otherOrg._id.toString(), // attempted injection of other org ID
        });

      // The server must lock the member to caller's org, ignoring or refusing otherOrg
      expect(res.status).to.equal(201);
      expect(res.body.data.organizationId).to.equal(existingBeekeeperOrg._id.toString());
      expect(res.body.data.organizationId).to.not.equal(otherOrg._id.toString());
    });

    it("PRIVILEGE ISOLATION: Org Admin CANNOT create a HoneyChain platform 'admin'", async function () {
      const res = await request(app)
        .post("/api/organizations/my/members")
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`)
        .send({
          name: "Escalated Admin",
          email: `escalated_${Date.now()}@sundarbans.org`,
          password: "SecurePassword123!",
          role: "admin", // forbidden role
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("cannot create HoneyChain Platform Admins");
    });

    it("Regular non-Org-Admin member CANNOT add other members (403)", async function () {
      const res = await request(app)
        .post("/api/organizations/my/members")
        .set("Authorization", `Bearer ${existingBeekeeperMemberToken}`)
        .send({
          name: "Sub Member",
          email: `sub_${Date.now()}@sundarbans.org`,
          password: "SecurePassword123!",
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("Organization Administrator privileges required");
    });

    it("Org Admin CANNOT deactivate members of another organization (403)", async function () {
      const res = await request(app)
        .patch(`/api/organizations/my/members/${otherOrgAdmin._id}/status`)
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`)
        .send({ isActive: false });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("outside your organization");
    });

    it("Org Admin CANNOT deactivate their own account (400)", async function () {
      const res = await request(app)
        .patch(`/api/organizations/my/members/${existingBeekeeperAdminUser._id}/status`)
        .set("Authorization", `Bearer ${existingBeekeeperAdminToken}`)
        .send({ isActive: false });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("cannot deactivate their own account");
    });
  });

  // ==========================================================================
  // 6. ACTIVE ORGANIZATION GATEKEEPING & SUSPENSION
  // ==========================================================================
  describe("6. Active Organization Gatekeeping & Suspension", function () {
    let suspendOrg: IOrganization;
    let suspendUser: IUser;
    let suspendToken: string;

    beforeEach(async function () {
      const tempWallet = await blockchainService.createUniqueOrganizationWallet();
      suspendOrg = await Organization.create({
        name: `Temp Org ${Date.now()}`,
        role: "beekeeper",
        walletAddress: tempWallet.address,
        isActive: true,
        status: "active",
      });

      const pwdHash = await authService.hashPassword("Password123!");
      suspendUser = await User.create({
        name: "Suspended Beekeeper",
        email: `suspend_${Date.now()}@tempo.org`,
        passwordHash: pwdHash,
        role: "beekeeper",
        organizationId: suspendOrg._id,
        isOrgAdmin: true,
        isActive: true,
      });
      suspendToken = authService.generateToken(suspendUser);
    });

    it("active organization user can access protected endpoints", async function () {
      const res = await request(app)
        .get("/api/organizations/my")
        .set("Authorization", `Bearer ${suspendToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });

    it("when organization is suspended, user login is rejected (403)", async function () {
      // Suspend organization
      await Organization.findByIdAndUpdate(suspendOrg._id, {
        status: "suspended",
        isActive: false,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: suspendUser.email,
          password: "Password123!",
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("inactive, suspended, or pending approval");
    });

    it("when organization is suspended, existing bearer tokens are rejected on protected routes (403)", async function () {
      // Suspend organization
      await Organization.findByIdAndUpdate(suspendOrg._id, {
        status: "suspended",
        isActive: false,
      });

      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${suspendToken}`)
        .send({
          quantityGrams: 10000,
          floralOrigin: "Mustard",
          apiaryLocation: { latitude: 22.5, longitude: 88.3, region: "Bengal" },
        });

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.message).to.include("inactive, suspended, or pending approval");
    });

    it("HoneyChain Admin can suspend and reactivate organization via PATCH /api/organizations/:id/status", async function () {
      // Admin suspends organization
      const suspendRes = await request(app)
        .patch(`/api/organizations/${suspendOrg._id}/status`)
        .set("Authorization", `Bearer ${systemAdminToken}`)
        .send({ status: "suspended" });

      expect(suspendRes.status).to.equal(200);
      expect(suspendRes.body.data.status).to.equal("suspended");
      expect(suspendRes.body.data.isActive).to.be.false;

      // Admin reactivates organization
      const reactivateRes = await request(app)
        .patch(`/api/organizations/${suspendOrg._id}/status`)
        .set("Authorization", `Bearer ${systemAdminToken}`)
        .send({ status: "active" });

      expect(reactivateRes.status).to.equal(200);
      expect(reactivateRes.body.data.status).to.equal("active");
      expect(reactivateRes.body.data.isActive).to.be.true;

      // User can now access protected routes again
      const accessRes = await request(app)
        .get("/api/organizations/my")
        .set("Authorization", `Bearer ${suspendToken}`);

      expect(accessRes.status).to.equal(200);
      expect(accessRes.body.success).to.be.true;
    });
  });
});
