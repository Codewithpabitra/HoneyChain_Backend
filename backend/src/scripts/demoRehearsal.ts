import { ethers } from "ethers";
import blockchainService, {
  QualityGrade,
} from "../services/blockchain.service.js";

async function main() {
  console.log("\n=======================================================");
  console.log("       HONEYCHAIN TESTNET REHEARSAL & DEMO SCRIPT       ");
  console.log("             Ethereum Sepolia (Chain ID 11155111)      ");
  console.log("=======================================================\n");

  const contractAddress = blockchainService.contractAddress;
  console.log(`Smart Contract Address: ${contractAddress}`);
  console.log(`Sepolia Etherscan Contract: https://sepolia.etherscan.io/address/${contractAddress}\n`);

  // Verify Stakeholders
  const beekeeper = blockchainService.getRoleContract("beekeeper").signer;
  const laboratory = blockchainService.getRoleContract("laboratory").signer;
  const processor = blockchainService.getRoleContract("processor").signer;
  const distributor = blockchainService.getRoleContract("distributor").signer;
  const auditor = blockchainService.getRoleContract("auditor").signer;

  console.log("Supply Chain Stakeholders:");
  console.log(`- Beekeeper:   ${beekeeper.address}`);
  console.log(`- Laboratory:  ${laboratory.address}`);
  console.log(`- Processor:   ${processor.address}`);
  console.log(`- Distributor: ${distributor.address}`);
  console.log(`- Auditor:     ${auditor.address}\n`);

  // Check balances
  const [bBal, lBal, pBal, dBal, aBal] = await Promise.all([
    blockchainService.provider.getBalance(beekeeper.address),
    blockchainService.provider.getBalance(laboratory.address),
    blockchainService.provider.getBalance(processor.address),
    blockchainService.provider.getBalance(distributor.address),
    blockchainService.provider.getBalance(auditor.address),
  ]);

  console.log("Stakeholder Gas Balances (ETH):");
  console.log(`- Beekeeper:   ${ethers.formatEther(bBal)} ETH`);
  console.log(`- Laboratory:  ${ethers.formatEther(lBal)} ETH`);
  console.log(`- Processor:   ${ethers.formatEther(pBal)} ETH`);
  console.log(`- Distributor: ${ethers.formatEther(dBal)} ETH`);
  console.log(`- Auditor:     ${ethers.formatEther(aBal)} ETH\n`);

  const batchId = `HC-DEMO-${Date.now().toString().slice(-6)}`;
  console.log(`-------------------------------------------------------`);
  console.log(`Target Batch Identifier: ${batchId}`);
  console.log(`-------------------------------------------------------\n`);

  // -----------------------------------------------------------------
  // STEP 1: Beekeeper Registers Harvest Batch
  // -----------------------------------------------------------------
  console.log(">>> [STEP 1/6] Beekeeper registering batch on-chain...");
  const harvestMetadata = {
    batchId,
    quantityGrams: 25000, // 25 kg
    floralOrigin: "Sundarbans Wild Mangrove",
    sourceHives: ["HIVE-SB-01", "HIVE-SB-04"],
    apiaryLocation: {
      region: "Sundarbans Biosphere Reserve",
      latitude: 21.9497,
      longitude: 89.1833,
    },
    harvestTimestamp: Math.floor(Date.now() / 1000),
  };
  const metadataHash = blockchainService.generateMetadataHash(harvestMetadata);

  console.log(`  Harvest Quantity: 25.0 kg (25,000 g)`);
  console.log(`  Floral Origin:    Sundarbans Wild Mangrove`);
  console.log(`  Metadata SHA-256: ${metadataHash}`);

  const regResult = await blockchainService.registerBatch(
    batchId,
    25000,
    metadataHash,
    harvestMetadata.harvestTimestamp
  );
  console.log(`  Status: Confirmed in Block #${regResult.blockNumber}`);
  console.log(`  Gas Used: ${regResult.gasUsed}`);
  console.log(`  Tx Hash: https://sepolia.etherscan.io/tx/${regResult.txHash}\n`);

  // -----------------------------------------------------------------
  // STEP 2: Laboratory Certifies Batch Quality
  // -----------------------------------------------------------------
  console.log(">>> [STEP 2/6] Laboratory certifying batch quality...");
  const labData = {
    batchId,
    certNumber: `FSSAI-NABL-${Date.now().toString().slice(-4)}`,
    moisturePercent: 17.5,
    spectrometryPurity: "Pass (No C4/C3 sugars detected)",
    hmfContentPpm: 14.2,
    diastaseNumber: 15.6,
  };
  const labReportHash = blockchainService.generateLabReportHash(labData);
  const moistureBasisPoints = 1750; // 17.50%

  console.log(`  Assay Certificate: ${labData.certNumber}`);
  console.log(`  Moisture Content:  17.50% (Grade A limit <= 18.00%)`);
  console.log(`  Quality Grade:     GradeA`);
  console.log(`  Report Digest:     ${labReportHash}`);

  const certResult = await blockchainService.certifyBatch(
    batchId,
    labReportHash,
    QualityGrade.GradeA,
    moistureBasisPoints
  );
  console.log(`  Status: Confirmed in Block #${certResult.blockNumber}`);
  console.log(`  Gas Used: ${certResult.gasUsed}`);
  console.log(`  Tx Hash: https://sepolia.etherscan.io/tx/${certResult.txHash}\n`);

  // -----------------------------------------------------------------
  // STEP 3: Beekeeper Transfers Custody to Processor
  // -----------------------------------------------------------------
  console.log(">>> [STEP 3/6] Beekeeper transferring custody to Processor...");
  const trans1Result = await blockchainService.transferCustody(
    batchId,
    processor.address,
    "Kolkata Organic Processing Facility",
    "beekeeper"
  );
  console.log(`  Recipient: Processor (${processor.address})`);
  console.log(`  Location:  Kolkata Organic Processing Facility`);
  console.log(`  Status:    Confirmed in Block #${trans1Result.blockNumber}`);
  console.log(`  Gas Used:  ${trans1Result.gasUsed}`);
  console.log(`  Tx Hash:   https://sepolia.etherscan.io/tx/${trans1Result.txHash}\n`);

  // -----------------------------------------------------------------
  // STEP 4: Processor Transfers Custody to Distributor
  // -----------------------------------------------------------------
  console.log(">>> [STEP 4/6] Processor transferring custody to Distributor...");
  const trans2Result = await blockchainService.transferCustody(
    batchId,
    distributor.address,
    "Delhi Central Distribution & Cold Hub",
    "processor"
  );
  console.log(`  Recipient: Distributor (${distributor.address})`);
  console.log(`  Location:  Delhi Central Distribution & Cold Hub`);
  console.log(`  Status:    Confirmed in Block #${trans2Result.blockNumber}`);
  console.log(`  Gas Used:  ${trans2Result.gasUsed}`);
  console.log(`  Tx Hash:   https://sepolia.etherscan.io/tx/${trans2Result.txHash}\n`);

  // -----------------------------------------------------------------
  // STEP 5: Consumer & Auditor Provenance Verification
  // -----------------------------------------------------------------
  console.log(">>> [STEP 5/6] Querying On-Chain State & Event Audit Trail...");
  const onChainBatch = await blockchainService.getBatch(batchId);
  const onChainHistory = await blockchainService.getBatchHistory(batchId);

  console.log("\n=======================================================");
  console.log("             VERIFIED ON-CHAIN AUDIT REPORT             ");
  console.log("=======================================================");
  console.log(`Batch ID:               ${batchId}`);
  console.log(`Lifecycle Status:       ${onChainBatch.statusName}`);
  console.log(`Quality Grade:          ${onChainBatch.qualityGradeName}`);
  console.log(`Certified Moisture:     ${onChainBatch.moisturePercentage.toFixed(2)}%`);
  console.log(`Current Custodian:      ${onChainBatch.currentCustodian}`);
  console.log(`Producer / Beekeeper:   ${onChainBatch.producer}`);
  console.log(`Certifying Laboratory:  ${onChainBatch.certifier}`);
  console.log(`Metadata Hash Match:    ${onChainBatch.metadataHash === metadataHash ? "VERIFIED (Tamper-Proof)" : "MISMATCH"}`);
  console.log(`Lab Report Hash Match:  ${onChainBatch.labReportHash === labReportHash ? "VERIFIED (Tamper-Proof)" : "MISMATCH"}`);

  console.log("\nReconstructed Chronological Custody Timeline:");
  onChainHistory.forEach((event, idx) => {
    console.log(`  ${idx + 1}. [${event.stage}] Event: ${event.eventType}`);
    console.log(`     Block: #${event.blockNumber} | Tx: ${event.txHash}`);
    console.log(`     Details: ${JSON.stringify(event.details)}`);
  });
  console.log("=======================================================\n");

  // -----------------------------------------------------------------
  // STEP 6: Auditor Recall Demonstration
  // -----------------------------------------------------------------
  console.log(">>> [STEP 6/6] Auditor executing quality recall test...");
  const recallReason = "Simulated end-to-end recall test during demonstration rehearsal";
  const recallResult = await blockchainService.recallBatch(
    batchId,
    recallReason,
    "auditor"
  );
  console.log(`  Recalled By: Auditor (${auditor.address})`);
  console.log(`  Reason:      ${recallReason}`);
  console.log(`  Status:      Confirmed in Block #${recallResult.blockNumber}`);
  console.log(`  Gas Used:    ${recallResult.gasUsed}`);
  console.log(`  Tx Hash:     https://sepolia.etherscan.io/tx/${recallResult.txHash}\n`);

  const finalBatchState = await blockchainService.getBatch(batchId);
  console.log(`Final On-Chain State: ${finalBatchState.statusName} (Terminal State)`);
  console.log("\n>>> End-to-end demonstration completed successfully on Ethereum Sepolia! <<<\n");
}

main().catch((err) => {
  console.error("\n[DEMO ERROR]", err);
  process.exit(1);
});
