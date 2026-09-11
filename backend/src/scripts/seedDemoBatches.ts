import mongoose from "mongoose";
import { ethers } from "ethers";
import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Apiary, Hive, Batch } from "../models/index.js";
import blockchainService, {
  QualityGrade,
  BatchStatus,
} from "../services/blockchain.service.js";

async function main() {
  console.log("\n=======================================================");
  console.log("       HONEYCHAIN 3-STAGE DEMO BATCHES POPULATOR       ");
  console.log("             Ethereum Sepolia & MongoDB                ");
  console.log("=======================================================\n");

  await connectDB(env.MONGO_URI);

  const beekeeperSigner = blockchainService.getRoleContract("beekeeper").signer;
  const labSigner = blockchainService.getRoleContract("laboratory").signer;
  const processorSigner = blockchainService.getRoleContract("processor").signer;
  const distributorSigner = blockchainService.getRoleContract("distributor").signer;
  const auditorSigner = blockchainService.getRoleContract("auditor").signer;

  console.log("Blockchain Stakeholder Signers:");
  console.log(`- Beekeeper:   ${beekeeperSigner.address}`);
  console.log(`- Laboratory:  ${labSigner.address}`);
  console.log(`- Processor:   ${processorSigner.address}`);
  console.log(`- Distributor: ${distributorSigner.address}`);
  console.log(`- Auditor:     ${auditorSigner.address}\n`);

  // Ensure Apiary and Hive exist for referencing
  let apiary = await Apiary.findOne({ apiaryId: "APIARY-SB-01" });
  if (!apiary) {
    apiary = await Apiary.create({
      apiaryId: "APIARY-SB-01",
      name: "Sundarbans Biosphere Apiary Alpha",
      beekeeper: beekeeperSigner.address,
      location: {
        latitude: 21.9497,
        longitude: 89.1833,
        region: "Sundarbans Biosphere Reserve, West Bengal",
        coordinates: { type: "Point", coordinates: [89.1833, 21.9497] },
      },
      floraType: ["Wild Mangrove Blossom", "Khalsi"],
      status: "active",
      capacity: 30,
    });
  }

  let hive = await Hive.findOne({ hiveId: "HIVE-SB-101" });
  if (!hive) {
    hive = await Hive.create({
      hiveId: "HIVE-SB-101",
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      beekeeper: beekeeperSigner.address,
      hiveType: "Smart-IoT-Box",
      beeSpecies: "Apis cerana indica",
      status: "active",
      deviceMetadata: {
        deviceId: "ESP32-SB-GW-01",
        communicationProtocol: "MQTT",
      },
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // =========================================================================
  // DEMO BATCH 1: COMPLETELY VERIFIED (Grade A, Transferred Custody, Untampered)
  // =========================================================================
  const BATCH_1_ID = "HC-VERIFIED-2026";
  console.log("------------------------------------------------------------------");
  console.log(`[1/3] Populating BATCH 1: ${BATCH_1_ID} (100% Fully Verified)`);
  console.log("------------------------------------------------------------------");

  const meta1 = {
    batchId: BATCH_1_ID,
    quantityGrams: 25000, // 25 kg
    floralOrigin: "Sundarbans Wild Mangrove & Khalsi",
    sourceHives: ["HIVE-SB-101", "HIVE-SB-102"],
    apiaryLocation: {
      latitude: 21.9497,
      longitude: 89.1833,
      region: "Sundarbans Biosphere Reserve, West Bengal",
    },
    harvestTimestamp: nowSec - 86400 * 3, // 3 days ago
  };
  const metaHash1 = blockchainService.generateMetadataHash(meta1);
  const bytes32Id1 = blockchainService.formatBytes32BatchId(BATCH_1_ID);

  let onChain1: any = null;
  try {
    onChain1 = await blockchainService.getBatch(BATCH_1_ID);
    console.log(`  + Batch 1 already exists on-chain. Status: ${onChain1.statusName}`);
  } catch (e) {
    console.log(`  + Registering Batch 1 on Ethereum Sepolia by Beekeeper...`);
    const regTx = await blockchainService.registerBatch(
      BATCH_1_ID,
      meta1.quantityGrams,
      metaHash1,
      meta1.harvestTimestamp
    );
    console.log(`    ✓ Registered in tx: https://sepolia.etherscan.io/tx/${regTx.txHash}`);
    onChain1 = await blockchainService.getBatch(BATCH_1_ID);
  }

  const labReportData1 = {
    certNumber: "FSSAI-NABL-2026-A891",
    testedParameter: "Moisture, C4/C3 Sugars, Diastase, HMF",
    moisturePercent: 17.4,
    purityStatus: "Passed - Pure Raw Honey",
    adulterantsDetected: false,
  };
  const labReportHash1 = blockchainService.generateLabReportHash(labReportData1);

  if (onChain1.qualityGrade === QualityGrade.None) {
    console.log(`  + Certifying Batch 1 on Ethereum Sepolia by Laboratory (Grade A, 17.40% moisture)...`);
    const certTx = await blockchainService.certifyBatch(
      BATCH_1_ID,
      labReportHash1,
      QualityGrade.GradeA,
      1740 // 17.40%
    );
    console.log(`    ✓ Certified in tx: https://sepolia.etherscan.io/tx/${certTx.txHash}`);
    onChain1 = await blockchainService.getBatch(BATCH_1_ID);
  }

  if (onChain1.currentCustodian.toLowerCase() === beekeeperSigner.address.toLowerCase()) {
    console.log(`  + Transferring Custody: Beekeeper -> Processor...`);
    const t1 = await blockchainService.transferCustody(
      BATCH_1_ID,
      processorSigner.address,
      "Kolkata Organic Honey Processing Hub",
      "beekeeper"
    );
    console.log(`    ✓ Custody handed to Processor: https://sepolia.etherscan.io/tx/${t1.txHash}`);
  }

  // Update/Save Batch 1 in MongoDB
  await Batch.findOneAndUpdate(
    { batchId: BATCH_1_ID },
    {
      batchId: BATCH_1_ID,
      batchIdBytes32: bytes32Id1,
      producer: beekeeperSigner.address,
      currentCustodian: processorSigner.address,
      quantityGrams: 25000,
      harvestTimestamp: meta1.harvestTimestamp,
      floralOrigin: meta1.floralOrigin,
      sourceHives: meta1.sourceHives,
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      hives: [hive._id],
      apiaryLocation: meta1.apiaryLocation,
      metadata: meta1,
      metadataHash: metaHash1,
      status: "Certified",
      quality: {
        grade: "GradeA",
        moisturePercentage: 17.4,
        moistureBasisPoints: 1740,
        certifiedBy: labSigner.address,
        labReportHash: labReportHash1,
        labReportData: labReportData1,
        certifiedAt: nowSec - 86400 * 2,
      },
      custodyHistory: [
        {
          from: beekeeperSigner.address,
          to: processorSigner.address,
          location: "Kolkata Organic Honey Processing Hub",
          timestamp: nowSec - 86400,
          role: "beekeeper",
        },
      ],
      recall: { recalled: false },
      blockchain: {
        network: "Ethereum Sepolia",
        chainId: 11155111,
        contractAddress: blockchainService.contractAddress,
        registrationConfirmed: true,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`  ✓ Batch 1 (${BATCH_1_ID}) synchronized in MongoDB.\n`);

  // =========================================================================
  // DEMO BATCH 2: PARTIALLY VERIFIED & LEFT EMPTY (Harvest Registered, Pending Lab)
  // =========================================================================
  const BATCH_2_ID = "HC-PENDING-2026";
  console.log("------------------------------------------------------------------");
  console.log(`[2/3] Populating BATCH 2: ${BATCH_2_ID} (Partially Verified / Awaiting Lab)`);
  console.log("------------------------------------------------------------------");

  const meta2 = {
    batchId: BATCH_2_ID,
    quantityGrams: 15000, // 15 kg
    floralOrigin: "Kashmir Valley White Acacia Blossom",
    sourceHives: ["HIVE-KV-201"],
    apiaryLocation: {
      latitude: 34.0837,
      longitude: 74.7973,
      region: "Kashmir Valley, Jammu & Kashmir",
    },
    harvestTimestamp: nowSec - 3600 * 4, // 4 hours ago
  };
  const metaHash2 = blockchainService.generateMetadataHash(meta2);
  const bytes32Id2 = blockchainService.formatBytes32BatchId(BATCH_2_ID);

  try {
    const onChain2 = await blockchainService.getBatch(BATCH_2_ID);
    console.log(`  + Batch 2 already exists on-chain. Status: ${onChain2.statusName}`);
  } catch (e) {
    console.log(`  + Registering Batch 2 on Ethereum Sepolia by Beekeeper...`);
    const regTx2 = await blockchainService.registerBatch(
      BATCH_2_ID,
      meta2.quantityGrams,
      metaHash2,
      meta2.harvestTimestamp
    );
    console.log(`    ✓ Registered in tx: https://sepolia.etherscan.io/tx/${regTx2.txHash}`);
  }

  // Update/Save Batch 2 in MongoDB (Quality left empty / pending)
  await Batch.findOneAndUpdate(
    { batchId: BATCH_2_ID },
    {
      batchId: BATCH_2_ID,
      batchIdBytes32: bytes32Id2,
      producer: beekeeperSigner.address,
      currentCustodian: beekeeperSigner.address,
      quantityGrams: 15000,
      harvestTimestamp: meta2.harvestTimestamp,
      floralOrigin: meta2.floralOrigin,
      sourceHives: meta2.sourceHives,
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      hives: [hive._id],
      apiaryLocation: meta2.apiaryLocation,
      metadata: meta2,
      metadataHash: metaHash2,
      status: "Registered",
      quality: {
        grade: "None",
        moisturePercentage: 0,
        moistureBasisPoints: 0,
      },
      custodyHistory: [],
      recall: { recalled: false },
      blockchain: {
        network: "Ethereum Sepolia",
        chainId: 11155111,
        contractAddress: blockchainService.contractAddress,
        registrationConfirmed: true,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`  ✓ Batch 2 (${BATCH_2_ID}) synchronized in MongoDB (Lab Assay Pending).\n`);

  // =========================================================================
  // DEMO BATCH 3: PARTIALLY VERIFIED & REJECTED / RECALLED (Substandard / Recall)
  // =========================================================================
  const BATCH_3_ID = "HC-RECALLED-2026";
  console.log("------------------------------------------------------------------");
  console.log(`[3/3] Populating BATCH 3: ${BATCH_3_ID} (Rejected by Lab / Recalled)`);
  console.log("------------------------------------------------------------------");

  const meta3 = {
    batchId: BATCH_3_ID,
    quantityGrams: 40000, // 40 kg
    floralOrigin: "Western Ghats Multifloral",
    sourceHives: ["HIVE-WG-301"],
    apiaryLocation: {
      latitude: 14.167,
      longitude: 74.833,
      region: "Western Ghats Forest Reserve, Karnataka",
    },
    harvestTimestamp: nowSec - 86400 * 5,
  };
  const metaHash3 = blockchainService.generateMetadataHash(meta3);
  const bytes32Id3 = blockchainService.formatBytes32BatchId(BATCH_3_ID);

  let onChain3: any = null;
  try {
    onChain3 = await blockchainService.getBatch(BATCH_3_ID);
    console.log(`  + Batch 3 already exists on-chain. Status: ${onChain3.statusName}`);
  } catch (e) {
    console.log(`  + Registering Batch 3 on Ethereum Sepolia by Beekeeper...`);
    const regTx3 = await blockchainService.registerBatch(
      BATCH_3_ID,
      meta3.quantityGrams,
      metaHash3,
      meta3.harvestTimestamp
    );
    console.log(`    ✓ Registered in tx: https://sepolia.etherscan.io/tx/${regTx3.txHash}`);
    onChain3 = await blockchainService.getBatch(BATCH_3_ID);
  }

  const labReportData3 = {
    certNumber: "FSSAI-NABL-2026-REJ04",
    testedParameter: "Moisture, C4 Sugars, Adulterants",
    moisturePercent: 21.8,
    purityStatus: "REJECTED - Excess moisture & C4 corn syrup markers detected",
    adulterantsDetected: true,
  };
  const labReportHash3 = blockchainService.generateLabReportHash(labReportData3);

  if (onChain3.qualityGrade === QualityGrade.None) {
    console.log(`  + Certifying Batch 3 on Ethereum Sepolia as Substandard (21.80% moisture)...`);
    const certTx3 = await blockchainService.certifyBatch(
      BATCH_3_ID,
      labReportHash3,
      QualityGrade.Substandard,
      2180 // 21.80% (Exceeds 20% legal limit)
    );
    console.log(`    ✓ Marked Substandard: https://sepolia.etherscan.io/tx/${certTx3.txHash}`);
    onChain3 = await blockchainService.getBatch(BATCH_3_ID);
  }

  let recallTxHash = "";
  if (onChain3.status !== BatchStatus.Recalled) {
    console.log(`  + Auditor issuing official safety recall on Ethereum Sepolia...`);
    const recallReason =
      "Laboratory Quality Failure: Moisture content 21.80% exceeds legal maximum (20.00%) and exogenous C4 sugar adulteration was detected by spectrometry.";
    const recTx = await blockchainService.recallBatch(
      BATCH_3_ID,
      recallReason,
      "auditor"
    );
    recallTxHash = recTx.txHash;
    console.log(`    ✓ Recalled in tx: https://sepolia.etherscan.io/tx/${recTx.txHash}`);
  }

  // Update/Save Batch 3 in MongoDB
  await Batch.findOneAndUpdate(
    { batchId: BATCH_3_ID },
    {
      batchId: BATCH_3_ID,
      batchIdBytes32: bytes32Id3,
      producer: beekeeperSigner.address,
      currentCustodian: beekeeperSigner.address,
      quantityGrams: 40000,
      harvestTimestamp: meta3.harvestTimestamp,
      floralOrigin: meta3.floralOrigin,
      sourceHives: meta3.sourceHives,
      apiary: apiary._id,
      apiaryId: apiary.apiaryId,
      hives: [hive._id],
      apiaryLocation: meta3.apiaryLocation,
      metadata: meta3,
      metadataHash: metaHash3,
      status: "Recalled",
      quality: {
        grade: "Substandard",
        moisturePercentage: 21.8,
        moistureBasisPoints: 2180,
        certifiedBy: labSigner.address,
        labReportHash: labReportHash3,
        labReportData: labReportData3,
        certifiedAt: nowSec - 86400 * 4,
      },
      custodyHistory: [],
      recall: {
        recalled: true,
        reason:
          "Laboratory Quality Failure: Moisture content 21.80% exceeds legal maximum (20.00%) and exogenous C4 sugar adulteration was detected by spectrometry.",
        recalledBy: auditorSigner.address,
        recalledAt: nowSec - 86400 * 3,
        txHash: recallTxHash || undefined,
      },
      blockchain: {
        network: "Ethereum Sepolia",
        chainId: 11155111,
        contractAddress: blockchainService.contractAddress,
        registrationConfirmed: true,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`  ✓ Batch 3 (${BATCH_3_ID}) synchronized in MongoDB (Status: Recalled).\n`);

  console.log("=======================================================");
  console.log("               ALL 3 BATCHES READY FOR DEMO            ");
  console.log("=======================================================");
  console.log(`1. HC-VERIFIED-2026 -> Completely Verified (Grade A, Custody Transferred)`);
  console.log(`2. HC-PENDING-2026  -> Harvest Registered, Lab Assay Pending`);
  console.log(`3. HC-RECALLED-2026 -> Rejected / Recalled by Auditor (Adulteration Alert)`);
  console.log("=======================================================\n");

  await disconnectDB();
}

main().catch(async (err) => {
  console.error("\n[SEED DEMO BATCHES ERROR]", err);
  await disconnectDB();
  process.exit(1);
});
