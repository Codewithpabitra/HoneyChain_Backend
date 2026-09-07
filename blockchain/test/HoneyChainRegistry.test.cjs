const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HoneyChainRegistry", function () {
  let registry;
  let admin, beekeeper, lab, processor, distributor, auditor, unauthorizedUser;

  const BEEKEEPER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BEEKEEPER_ROLE"));
  const LABORATORY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LABORATORY_ROLE"));
  const PROCESSOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROCESSOR_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));

  const batchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH-2026-001"));
  const batchId2 = ethers.keccak256(ethers.toUtf8Bytes("BATCH-2026-002"));
  const nonExistentBatchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH-NON-EXISTENT"));
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes('{"hives":["H1","H2"],"origin":"Sundarbans"}'));
  const labReportHash = ethers.keccak256(ethers.toUtf8Bytes("LAB-CERT-REPORT-001"));
  const quantityGrams = 24500; // 24.5 kg
  const harvestTimestamp = 1725732000;
  const moistureBasisPoints = 1750; // 17.50%
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

    const HoneyChainRegistryFactory = await ethers.getContractFactory("HoneyChainRegistry");
    registry = await HoneyChainRegistryFactory.deploy(admin.address);
    await registry.waitForDeployment();

    // Assign roles through admin
    await registry.connect(admin).grantRole(BEEKEEPER_ROLE, beekeeper.address);
    await registry.connect(admin).grantRole(LABORATORY_ROLE, lab.address);
    await registry.connect(admin).grantRole(PROCESSOR_ROLE, processor.address);
    await registry.connect(admin).grantRole(DISTRIBUTOR_ROLE, distributor.address);
    await registry.connect(admin).grantRole(AUDITOR_ROLE, auditor.address);
  });

  describe("1. Registration", function () {
    it("1. authorized registration: beekeeper can register batch", async function () {
      const tx = await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
      await tx.wait();

      expect(await registry.batchExists(batchId)).to.be.true;
      const batch = await registry.getBatch(batchId);
      expect(batch.producer).to.equal(beekeeper.address);
      expect(batch.currentCustodian).to.equal(beekeeper.address);
      expect(batch.quantityGrams).to.equal(quantityGrams);
      expect(batch.metadataHash).to.equal(metadataHash);
      expect(batch.harvestTimestamp).to.equal(harvestTimestamp);
      expect(batch.status).to.equal(BatchStatus.Registered);
      expect(batch.qualityGrade).to.equal(QualityGrade.None);
    });

    it("2. unauthorized registration: non-beekeeper caller is rejected", async function () {
      await expect(
        registry
          .connect(unauthorizedUser)
          .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("3. duplicate registration: cannot register existing batch ID", async function () {
      await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);

      await expect(
        registry
          .connect(beekeeper)
          .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyExists")
        .withArgs(batchId);
    });

    it("should revert if batchId, quantity or metadataHash are invalid", async function () {
      await expect(
        registry
          .connect(beekeeper)
          .registerBatch(ethers.ZeroHash, quantityGrams, metadataHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "InvalidBatchId");

      await expect(
        registry
          .connect(beekeeper)
          .registerBatch(batchId, 0, metadataHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "InvalidQuantity");

      await expect(
        registry
          .connect(beekeeper)
          .registerBatch(batchId, quantityGrams, ethers.ZeroHash, harvestTimestamp)
      ).to.be.revertedWithCustomError(registry, "InvalidMetadataHash");
    });
  });

  describe("2. Certification", function () {
    beforeEach(async function () {
      await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
    });

    it("4. valid certification: laboratory certifies batch", async function () {
      const tx = await registry
        .connect(lab)
        .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints);
      await tx.wait();

      const batch = await registry.getBatch(batchId);
      expect(batch.certifier).to.equal(lab.address);
      expect(batch.labReportHash).to.equal(labReportHash);
      expect(batch.qualityGrade).to.equal(QualityGrade.GradeA);
      expect(batch.moistureBasisPoints).to.equal(moistureBasisPoints);
      expect(batch.status).to.equal(BatchStatus.Certified);
      expect(batch.certificationTimestamp).to.be.gt(0);
    });

    it("5. certification before registration: cannot certify non-existent batch", async function () {
      await expect(
        registry
          .connect(lab)
          .certifyBatch(nonExistentBatchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "BatchDoesNotExist")
        .withArgs(nonExistentBatchId);
    });

    it("6. unauthorized certification: non-lab caller is rejected", async function () {
      await expect(
        registry
          .connect(beekeeper)
          .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");

      await expect(
        registry
          .connect(unauthorizedUser)
          .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("duplicate certification: cannot certify an already certified batch", async function () {
      await registry
        .connect(lab)
        .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints);

      await expect(
        registry
          .connect(lab)
          .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyCertified")
        .withArgs(batchId);
    });
  });

  describe("3. Custody Transfer", function () {
    beforeEach(async function () {
      await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
      await registry
        .connect(lab)
        .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints);
    });

    it("7. valid transfer: custodian transfers custody to authorized participants", async function () {
      // Beekeeper -> Processor
      await registry
        .connect(beekeeper)
        .transferCustody(batchId, processor.address, "Kolkata Processing Center");
      let batch = await registry.getBatch(batchId);
      expect(batch.currentCustodian).to.equal(processor.address);
      expect(batch.status).to.equal(BatchStatus.InTransit);

      // Processor -> Distributor
      await registry
        .connect(processor)
        .transferCustody(batchId, distributor.address, "Delhi Logistics Warehouse");
      batch = await registry.getBatch(batchId);
      expect(batch.currentCustodian).to.equal(distributor.address);
      expect(batch.status).to.equal(BatchStatus.InTransit);
    });

    it("8. unauthorized transfer: non-custodian cannot transfer custody", async function () {
      await expect(
        registry
          .connect(unauthorizedUser)
          .transferCustody(batchId, processor.address, "Unauthorized Hub")
      ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian")
        .withArgs(unauthorizedUser.address, beekeeper.address);

      await expect(
        registry
          .connect(admin)
          .transferCustody(batchId, processor.address, "Admin Hub")
      ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian")
        .withArgs(admin.address, beekeeper.address);
    });

    it("9. invalid/non-owner transfer: transfer to self or zero address or unauthorized recipient", async function () {
      // Transfer to self
      await expect(
        registry
          .connect(beekeeper)
          .transferCustody(batchId, beekeeper.address, "Self Hub")
      ).to.be.revertedWithCustomError(registry, "InvalidRecipient");

      // Transfer to Zero address
      await expect(
        registry
          .connect(beekeeper)
          .transferCustody(batchId, ethers.ZeroAddress, "Zero Hub")
      ).to.be.revertedWithCustomError(registry, "InvalidRecipient");

      // Transfer to recipient without supply chain role
      await expect(
        registry
          .connect(beekeeper)
          .transferCustody(batchId, unauthorizedUser.address, "Rogue Hub")
      ).to.be.revertedWithCustomError(registry, "RecipientNotAuthorized")
        .withArgs(unauthorizedUser.address);
    });
  });

  describe("4. Recall Operations", function () {
    beforeEach(async function () {
      await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);
    });

    it("10. valid recall: admin, producer, lab, or auditor can recall batch", async function () {
      // Producer recall test
      await registry
        .connect(beekeeper)
        .recallBatch(batchId, "Quality contamination suspected by producer");
      let batch = await registry.getBatch(batchId);
      expect(batch.status).to.equal(BatchStatus.Recalled);

      // Register second batch and test Auditor recall
      await registry
        .connect(beekeeper)
        .registerBatch(batchId2, quantityGrams, metadataHash, harvestTimestamp);
      await registry
        .connect(auditor)
        .recallBatch(batchId2, "Failed regulatory pesticide screening");
      batch = await registry.getBatch(batchId2);
      expect(batch.status).to.equal(BatchStatus.Recalled);
    });

    it("11. unauthorized recall: unauthorized user or processor cannot recall", async function () {
      await expect(
        registry
          .connect(unauthorizedUser)
          .recallBatch(batchId, "Malicious recall attempt")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedRecall")
        .withArgs(unauthorizedUser.address);

      await expect(
        registry
          .connect(processor)
          .recallBatch(batchId, "Processor unauthorized recall attempt")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedRecall")
        .withArgs(processor.address);
    });

    it("12. transfer after recall: cannot transfer or certify a recalled batch", async function () {
      await registry
        .connect(beekeeper)
        .recallBatch(batchId, "Safety recall");

      await expect(
        registry
          .connect(beekeeper)
          .transferCustody(batchId, processor.address, "Processing Plant")
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyRecalled")
        .withArgs(batchId);

      await expect(
        registry
          .connect(lab)
          .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      ).to.be.revertedWithCustomError(registry, "BatchAlreadyRecalled")
        .withArgs(batchId);
    });
  });

  describe("5. Event Emission & State Integrity", function () {
    it("13. correct event emission: emits all lifecycle events with exact indexed arguments", async function () {
      // 1. BatchRegistered event
      await expect(
        registry
          .connect(beekeeper)
          .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp)
      )
        .to.emit(registry, "BatchRegistered")
        .withArgs(batchId, beekeeper.address, quantityGrams, metadataHash, harvestTimestamp);

      // 2. BatchCertified event
      await expect(
        registry
          .connect(lab)
          .certifyBatch(batchId, labReportHash, QualityGrade.GradeA, moistureBasisPoints)
      )
        .to.emit(registry, "BatchCertified")
        .withArgs(
          batchId,
          lab.address,
          labReportHash,
          QualityGrade.GradeA,
          moistureBasisPoints,
          (ts) => ts > 0
        );

      // 3. CustodyTransferred event
      await expect(
        registry
          .connect(beekeeper)
          .transferCustody(batchId, processor.address, "Hub Alpha")
      )
        .to.emit(registry, "CustodyTransferred")
        .withArgs(batchId, beekeeper.address, processor.address, "Hub Alpha", (ts) => ts > 0);

      // 4. BatchRecalled event
      await expect(
        registry
          .connect(admin)
          .recallBatch(batchId, "FSSAI safety recall order")
      )
        .to.emit(registry, "BatchRecalled")
        .withArgs(batchId, admin.address, "FSSAI safety recall order", (ts) => ts > 0);
    });

    it("14. correct batch state: getBatch and batchExists verification", async function () {
      expect(await registry.batchExists(batchId)).to.be.false;

      await expect(
        registry.getBatch(batchId)
      ).to.be.revertedWithCustomError(registry, "BatchDoesNotExist")
        .withArgs(batchId);

      await registry
        .connect(beekeeper)
        .registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp);

      expect(await registry.batchExists(batchId)).to.be.true;

      const batch = await registry.getBatch(batchId);
      expect(batch.producer).to.equal(beekeeper.address);
      expect(batch.currentCustodian).to.equal(beekeeper.address);
      expect(batch.quantityGrams).to.equal(quantityGrams);
      expect(batch.metadataHash).to.equal(metadataHash);
      expect(batch.harvestTimestamp).to.equal(harvestTimestamp);
    });
  });
});
