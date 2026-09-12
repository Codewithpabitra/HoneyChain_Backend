const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HoneyChainRegistryV2", function () {
  let registry;
  let admin, beekeeper, lab, processor, distributor, auditor, unauthorizedUser;

  const BEEKEEPER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BEEKEEPER_ROLE"));
  const LABORATORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LABORATORY_ROLE"));
  const PROCESSOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROCESSOR_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));

  const batchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH-V2-001"));
  const batchId2 = ethers.keccak256(ethers.toUtf8Bytes("BATCH-V2-002"));
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes('{"hives":["H1","H2"],"origin":"Sundarbans"}'));
  const labReportHash = ethers.keccak256(ethers.toUtf8Bytes("LAB-CERT-V2-REPORT-001"));
  const quantityGrams = 35000; // 35 kg
  const harvestTimestamp = 1725732000;
  const moistureBasisPoints = 1780; // 17.80%

  const QualityGrade = {
    None: 0,
    GradeA: 1,
    GradeB: 2,
    GradeC: 3,
    Substandard: 4,
  };

  const BatchStatus = {
    Registered: 0,
    Certified: 1,
    InTransit: 2,
    Delivered: 3,
    Recalled: 4,
  };

  beforeEach(async function () {
    [admin, beekeeper, lab, processor, distributor, auditor, unauthorizedUser] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("HoneyChainRegistryV2");
    registry = await Factory.deploy(admin.address);
    await registry.waitForDeployment();

    // Assign roles
    await registry.connect(admin).grantRole(BEEKEEPER_ROLE, beekeeper.address);
    await registry.connect(admin).grantRole(LABORATORY_ROLE, lab.address);
    await registry.connect(admin).grantRole(PROCESSOR_ROLE, processor.address);
    await registry.connect(admin).grantRole(DISTRIBUTOR_ROLE, distributor.address);
    await registry.connect(admin).grantRole(AUDITOR_ROLE, auditor.address);
  });

  describe("1. Registration", function () {
    it("allows authorized beekeeper to register a batch", async function () {
      const tx = await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
      await tx.wait();

      expect(await registry.batchExists(batchId)).to.be.true;

      const batch = await registry.getBatch(batchId);
      expect(batch.producer).to.equal(beekeeper.address);
      expect(batch.currentCustodian).to.equal(beekeeper.address);
      expect(batch.quantityGrams).to.equal(BigInt(quantityGrams));
      expect(batch.status).to.equal(BatchStatus.Registered);
      expect(batch.qualityGrade).to.equal(QualityGrade.None);
    });

    it("reverts if non-beekeeper tries to register", async function () {
      await expect(
        registry.connect(unauthorizedUser).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("reverts on duplicate batch registration", async function () {
      await registry.connect(beekeeper).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
      await expect(
        registry.connect(beekeeper).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyExists");
    });
  });

  describe("2. Two-Step Custody Handshake & Strict Sequence", function () {
    beforeEach(async function () {
      await registry.connect(beekeeper).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
    });

    it("prevents arbitrary jumping (e.g. Beekeeper directly to Processor)", async function () {
      await expect(
        registry.connect(beekeeper).proposeCustodyTransfer(batchId, processor.address, "Factory A")
      ).to.be.revertedWithCustomError(registry, "InvalidLifecycleTransition");
    });

    it("allows Beekeeper to propose to Laboratory and Laboratory to accept", async function () {
      await expect(
        registry.connect(beekeeper).proposeCustodyTransfer(batchId, lab.address, "Lab Central Intake")
      )
        .to.emit(registry, "CustodyTransferProposed")
        .withArgs(batchId, beekeeper.address, lab.address, "Lab Central Intake", (ts) => ts > 0);

      const pending = await registry.getPendingTransfer(batchId);
      expect(pending.exists).to.be.true;
      expect(pending.recipient).to.equal(lab.address);
      expect(pending.location).to.equal("Lab Central Intake");

      // Non-recipient cannot accept
      await expect(
        registry.connect(unauthorizedUser).acceptCustody(batchId)
      ).to.be.revertedWithCustomError(registry, "CallerNotProposedRecipient");

      // Recipient accepts
      await expect(registry.connect(lab).acceptCustody(batchId))
        .to.emit(registry, "CustodyTransferAccepted")
        .withArgs(batchId, beekeeper.address, lab.address, "Lab Central Intake", (ts) => ts > 0);

      const batch = await registry.getBatch(batchId);
      expect(batch.currentCustodian).to.equal(lab.address);
      expect(batch.laboratory).to.equal(lab.address);

      const pendingAfter = await registry.getPendingTransfer(batchId);
      expect(pendingAfter.exists).to.be.false;
    });

    it("prevents Laboratory from transferring to Processor before certification", async function () {
      await registry.connect(beekeeper).proposeCustodyTransfer(batchId, lab.address, "Lab Central Intake");
      await registry.connect(lab).acceptCustody(batchId);

      // Lab is custodian, but status is still Registered (uncertified)
      await expect(
        registry.connect(lab).proposeCustodyTransfer(batchId, processor.address, "Processing Plant")
      ).to.be.revertedWithCustomError(registry, "InvalidLifecycleTransition");
    });
  });

  describe("3. Laboratory Certification", function () {
    beforeEach(async function () {
      await registry.connect(beekeeper).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
      await registry.connect(beekeeper).proposeCustodyTransfer(batchId, lab.address, "Lab Central Intake");
      await registry.connect(lab).acceptCustody(batchId);
    });

    it("allows Laboratory in custody to certify batch quality", async function () {
      await expect(
        registry.connect(lab).certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      )
        .to.emit(registry, "BatchCertified")
        .withArgs(batchId, lab.address, labReportHash, QualityGrade.GradeA, moistureBasisPoints, (ts) => ts > 0);

      const batch = await registry.getBatch(batchId);
      expect(batch.status).to.equal(BatchStatus.Certified);
      expect(batch.qualityGrade).to.equal(QualityGrade.GradeA);
      expect(batch.moistureBasisPoints).to.equal(moistureBasisPoints);
      expect(batch.labReportHash).to.equal(labReportHash);
    });

    it("reverts certification if caller is not laboratory or does not hold custody", async function () {
      await expect(
        registry.connect(beekeeper).certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("cannot certify an already certified batch", async function () {
      await registry.connect(lab).certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints);
      await expect(
        registry.connect(lab).certifyBatch(batchId, labReportHash, QualityGrade.GradeB, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyCertified");
    });
  });

  describe("4. End-to-End Full Flow (Beekeeper -> Lab -> Processor -> Distributor -> Delivered)", function () {
    it("completes the full verified lifecycle", async function () {
      // 1. Beekeeper registers
      await registry.connect(beekeeper).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);

      // 2. Beekeeper -> Lab
      await registry.connect(beekeeper).proposeCustodyTransfer(batchId, lab.address, "Lab Intake Dock");
      await registry.connect(lab).acceptCustody(batchId);

      // 3. Lab certifies
      await registry.connect(lab).certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints);

      // 4. Lab -> Processor
      await registry.connect(lab).proposeCustodyTransfer(batchId, processor.address, "Packaging Plant 3");
      await registry.connect(processor).acceptCustody(batchId);

      let batch = await registry.getBatch(batchId);
      expect(batch.status).to.equal(BatchStatus.InTransit);
      expect(batch.processor).to.equal(processor.address);
      expect(batch.currentCustodian).to.equal(processor.address);

      // 5. Processor -> Distributor
      await registry.connect(processor).proposeCustodyTransfer(batchId, distributor.address, "Logistics Hub 7");
      await registry.connect(distributor).acceptCustody(batchId);

      batch = await registry.getBatch(batchId);
      expect(batch.status).to.equal(BatchStatus.InTransit);
      expect(batch.distributor).to.equal(distributor.address);
      expect(batch.currentCustodian).to.equal(distributor.address);

      // 6. Distributor delivers
      await expect(
        registry.connect(distributor).deliverBatch(batchId, "Supermarket Shelf B4, Berlin")
      )
        .to.emit(registry, "BatchDelivered")
        .withArgs(batchId, distributor.address, "Supermarket Shelf B4, Berlin", (ts) => ts > 0);

      batch = await registry.getBatch(batchId);
      expect(batch.status).to.equal(BatchStatus.Delivered);

      // Cannot propose transfer after delivered
      await expect(
        registry.connect(distributor).proposeCustodyTransfer(batchId, processor.address, "Return")
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyDelivered");
    });
  });

  describe("5. Stakeholder Review Request & Auditor Governance", function () {
    beforeEach(async function () {
      await registry.connect(beekeeper).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
      await registry.connect(beekeeper).proposeCustodyTransfer(batchId, lab.address, "Lab Intake");
      await registry.connect(lab).acceptCustody(batchId);
    });

    it("stakeholder can request review, but cannot directly reject/recall", async function () {
      // Direct call to rejectBatch by Beekeeper fails
      await expect(
        registry.connect(beekeeper).rejectBatch(batchId, 0, "Fake honey suspected")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedAction");

      // Direct call to rejectBatch by Lab fails
      await expect(
        registry.connect(lab).rejectBatch(batchId, 0, "Failed test")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedAction");

      // Lab requests review
      await expect(
        registry.connect(lab).requestAuditorReview(batchId, "Suspected C4 sugar adulteration")
      )
        .to.emit(registry, "AuditorReviewRequested")
        .withArgs(batchId, 1, lab.address, "Suspected C4 sugar adulteration", (ts) => ts > 0);

      const activeReq = await registry.getActiveReviewRequest(batchId);
      expect(activeReq.requestId).to.equal(1n);
      expect(activeReq.requester).to.equal(lab.address);
      expect(activeReq.reason).to.equal("Suspected C4 sugar adulteration");
      expect(activeReq.active).to.be.true;

      // Cannot open a second active review request while one is open
      await expect(
        registry.connect(beekeeper).requestAuditorReview(batchId, "Another issue")
      ).to.be.revertedWithCustomError(registry, "ActiveReviewRequestExists");
    });

    it("auditor can clear review request", async function () {
      await registry.connect(lab).requestAuditorReview(batchId, "Investigation required");
      const activeReq = await registry.getActiveReviewRequest(batchId);

      // Non-auditor cannot clear
      await expect(
        registry.connect(lab).clearAuditorReview(batchId, activeReq.requestId, "All good")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedAction");

      // Auditor clears
      await expect(
        registry.connect(auditor).clearAuditorReview(batchId, activeReq.requestId, "Passed isotopic re-test")
      )
        .to.emit(registry, "AuditorReviewCleared")
        .withArgs(batchId, activeReq.requestId, auditor.address, "Passed isotopic re-test", (ts) => ts > 0);

      // Verify active review request is now cleared
      await expect(
        registry.getActiveReviewRequest(batchId)
      ).to.be.revertedWithCustomError(registry, "NoActiveReviewRequest");

      const reqDetails = await registry.getReviewRequest(activeReq.requestId);
      expect(reqDetails.active).to.be.false;
      expect(reqDetails.resolved).to.be.true;
      expect(reqDetails.decidedBy).to.equal(auditor.address);
      expect(reqDetails.resolutionNote).to.equal("Passed isotopic re-test");
    });

    it("auditor can reject and recall batch (terminal)", async function () {
      await registry.connect(lab).requestAuditorReview(batchId, "Antibiotic residue found");
      const activeReq = await registry.getActiveReviewRequest(batchId);

      await expect(
        registry.connect(auditor).rejectBatch(batchId, activeReq.requestId, "Chloramphenicol confirmed. Recall batch.")
      )
        .to.emit(registry, "BatchRecalled")
        .withArgs(batchId, auditor.address, "Chloramphenicol confirmed. Recall batch.", (ts) => ts > 0);

      const batch = await registry.getBatch(batchId);
      expect(batch.status).to.equal(BatchStatus.Recalled);

      // Any further transfer proposal must fail
      await expect(
        registry.connect(lab).proposeCustodyTransfer(batchId, processor.address, "Disposal")
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyRecalled");
    });
  });
});
