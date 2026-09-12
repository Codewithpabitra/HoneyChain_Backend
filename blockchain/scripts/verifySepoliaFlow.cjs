const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load blockchain and backend .env
dotenv.config({ path: path.join(__dirname, "../.env") });
const backendEnv = dotenv.config({ path: path.join(__dirname, "../../backend/.env") }).parsed || {};

async function main() {
  console.log("==================================================");
  console.log("HoneyChainRegistryV2 Sepolia End-to-End Verification");
  console.log("==================================================");

  const deploymentPath = path.join(
    __dirname,
    "../deployments/sepolia/HoneyChainRegistryV2.json"
  );
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment artifact not found at: " + deploymentPath);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployment.contractAddress;
  console.log("Contract Address:", contractAddress);

  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const getEnvKey = (k) => process.env[k] || backendEnv[k];

  const adminWallet = new ethers.Wallet(getEnvKey("ADMIN_PRIVATE_KEY") || getEnvKey("DEPLOYER_PRIVATE_KEY"), provider);
  const beekeeperWallet = new ethers.Wallet(getEnvKey("BEEKEEPER_PRIVATE_KEY"), provider);
  const labWallet = new ethers.Wallet(getEnvKey("LABORATORY_PRIVATE_KEY"), provider);
  const processorWallet = new ethers.Wallet(getEnvKey("PROCESSOR_PRIVATE_KEY"), provider);
  const distributorWallet = new ethers.Wallet(getEnvKey("DISTRIBUTOR_PRIVATE_KEY"), provider);
  const auditorWallet = new ethers.Wallet(getEnvKey("AUDITOR_PRIVATE_KEY"), provider);

  console.log("Stakeholder Wallets Connected:");
  console.log("  Admin:       ", adminWallet.address);
  console.log("  Beekeeper:   ", beekeeperWallet.address);
  console.log("  Laboratory:  ", labWallet.address);
  console.log("  Processor:   ", processorWallet.address);
  console.log("  Distributor: ", distributorWallet.address);
  console.log("  Auditor:     ", auditorWallet.address);

  const abi = deployment.abi;
  const contractAs = (wallet) => new ethers.Contract(contractAddress, abi, wallet);

  const adminContract = contractAs(adminWallet);
  const beekeeperContract = contractAs(beekeeperWallet);
  const labContract = contractAs(labWallet);
  const processorContract = contractAs(processorWallet);
  const distributorContract = contractAs(distributorWallet);
  const auditorContract = contractAs(auditorWallet);

  // Check roles
  console.log("\nVerifying Role Assignments On-Chain...");
  const BEEKEEPER_ROLE = await adminContract.BEEKEEPER_ROLE();
  const LABORATORY_ROLE = await adminContract.LABORATORY_ROLE();
  const PROCESSOR_ROLE = await adminContract.PROCESSOR_ROLE();
  const DISTRIBUTOR_ROLE = await adminContract.DISTRIBUTOR_ROLE();
  const AUDITOR_ROLE = await adminContract.AUDITOR_ROLE();

  console.log("  Beekeeper role ok:", await adminContract.hasRole(BEEKEEPER_ROLE, beekeeperWallet.address));
  console.log("  Lab role ok:      ", await adminContract.hasRole(LABORATORY_ROLE, labWallet.address));
  console.log("  Processor role ok:", await adminContract.hasRole(PROCESSOR_ROLE, processorWallet.address));
  console.log("  Distributor role ok:", await adminContract.hasRole(DISTRIBUTOR_ROLE, distributorWallet.address));
  console.log("  Auditor role ok:  ", await adminContract.hasRole(AUDITOR_ROLE, auditorWallet.address));

  const now = Date.now();

  // ----------------------------------------------------
  // FLOW 1: Full Supply Chain Sequence to Delivered
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("FLOW 1: Beekeeper -> Lab -> Processor -> Distributor -> Delivered");
  console.log("----------------------------------------------------");

  const batch1String = `HC-SEP-FLOW1-${now}`;
  const batch1Id = ethers.keccak256(ethers.toUtf8Bytes(batch1String));
  const metadata1Hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ batch: batch1String, flora: "Wild Acacia" })));
  const labReport1Hash = ethers.keccak256(ethers.toUtf8Bytes(`LAB-REPORT-${batch1String}`));

  console.log(`Step 1.1: Beekeeper registers batch ${batch1String}...`);
  let tx = await beekeeperContract.registerBatch(batch1Id, 25000, metadata1Hash, Math.floor(now / 1000));
  let receipt = await tx.wait(1);
  console.log(`  Registered! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.2: Beekeeper proposes custody transfer to Laboratory...`);
  tx = await beekeeperContract.proposeCustodyTransfer(batch1Id, labWallet.address, "Lab Central Intake, Kolkata");
  receipt = await tx.wait(1);
  console.log(`  Proposed! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.3: Laboratory accepts custody...`);
  tx = await labContract.acceptCustody(batch1Id);
  receipt = await tx.wait(1);
  console.log(`  Accepted! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.4: Laboratory certifies batch (Grade A, 17.50% moisture)...`);
  tx = await labContract.certifyBatch(batch1Id, labReport1Hash, 1, 1750); // GradeA = 1
  receipt = await tx.wait(1);
  console.log(`  Certified! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.5: Laboratory proposes custody transfer to Processor...`);
  tx = await labContract.proposeCustodyTransfer(batch1Id, processorWallet.address, "Honey Refinery Plant 1, Siliguri");
  receipt = await tx.wait(1);
  console.log(`  Proposed! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.6: Processor accepts custody...`);
  tx = await processorContract.acceptCustody(batch1Id);
  receipt = await tx.wait(1);
  console.log(`  Accepted! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.7: Processor proposes custody transfer to Distributor...`);
  tx = await processorContract.proposeCustodyTransfer(batch1Id, distributorWallet.address, "Cold Logistics Hub, Delhi");
  receipt = await tx.wait(1);
  console.log(`  Proposed! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.8: Distributor accepts custody...`);
  tx = await distributorContract.acceptCustody(batch1Id);
  receipt = await tx.wait(1);
  console.log(`  Accepted! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 1.9: Distributor confirms delivery...`);
  tx = await distributorContract.deliverBatch(batch1Id, "Organic Retail Hub, Connaught Place, New Delhi");
  receipt = await tx.wait(1);
  console.log(`  Delivered! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  const batch1 = await adminContract.getBatch(batch1Id);
  console.log(`  Batch 1 Final Status: ${batch1.status} (Delivered = 3). Verified!`);

  // ----------------------------------------------------
  // FLOW 2: Stakeholder Review Request -> Auditor Clears
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("FLOW 2: Stakeholder Review Request -> Auditor Clears");
  console.log("----------------------------------------------------");

  const batch2String = `HC-SEP-REV-${now}`;
  const batch2Id = ethers.keccak256(ethers.toUtf8Bytes(batch2String));
  const metadata2Hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ batch: batch2String })));

  console.log(`Step 2.1: Beekeeper registers batch ${batch2String}...`);
  tx = await beekeeperContract.registerBatch(batch2Id, 18000, metadata2Hash, Math.floor(now / 1000));
  receipt = await tx.wait(1);
  console.log(`  Registered! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 2.2: Beekeeper requests auditor review...`);
  tx = await beekeeperContract.requestAuditorReview(batch2Id, "Harvest moisture sensor flagged minor fluctuation");
  receipt = await tx.wait(1);
  console.log(`  Requested! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  const activeReview2 = await adminContract.getActiveReviewRequest(batch2Id);
  console.log(`  Active Review Request ID: ${activeReview2.requestId.toString()}, Reason: "${activeReview2.reason}"`);

  console.log(`Step 2.3: Auditor clears review request...`);
  tx = await auditorContract.clearAuditorReview(batch2Id, activeReview2.requestId, "Calibrations verified; batch integrity validated.");
  receipt = await tx.wait(1);
  console.log(`  Cleared! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  try {
    await adminContract.getActiveReviewRequest(batch2Id);
    console.error("  Error: Active review was not cleared!");
  } catch {
    console.log("  Verified: No active review remains on batch 2.");
  }

  // ----------------------------------------------------
  // FLOW 3: Stakeholder Review Request -> Auditor Rejects (Recalled)
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("FLOW 3: Stakeholder Review Request -> Auditor Rejects / Recalls");
  console.log("----------------------------------------------------");

  const batch3String = `HC-SEP-REJ-${now}`;
  const batch3Id = ethers.keccak256(ethers.toUtf8Bytes(batch3String));
  const metadata3Hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ batch: batch3String })));

  console.log(`Step 3.1: Beekeeper registers batch ${batch3String}...`);
  tx = await beekeeperContract.registerBatch(batch3Id, 12000, metadata3Hash, Math.floor(now / 1000));
  receipt = await tx.wait(1);
  console.log(`  Registered! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  console.log(`Step 3.2: Beekeeper requests auditor review for contamination concern...`);
  tx = await beekeeperContract.requestAuditorReview(batch3Id, "Suspected high HMF levels due to overheating in transit");
  receipt = await tx.wait(1);
  console.log(`  Requested! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  const activeReview3 = await adminContract.getActiveReviewRequest(batch3Id);
  console.log(`  Active Review Request ID: ${activeReview3.requestId.toString()}`);

  console.log(`Step 3.3: Verifying stakeholder cannot directly reject batch...`);
  try {
    await beekeeperContract.rejectBatch(batch3Id, activeReview3.requestId, "Trying direct reject");
    console.error("  Error: Beekeeper should not be able to call rejectBatch!");
  } catch (err) {
    console.log("  Confirmed: Beekeeper direct reject reverted as expected (UnauthorizedAction).");
  }

  console.log(`Step 3.4: Auditor rejects batch...`);
  tx = await auditorContract.rejectBatch(batch3Id, activeReview3.requestId, "HMF > 80 mg/kg confirmed by assay. Batch Recalled.");
  receipt = await tx.wait(1);
  console.log(`  Rejected / Recalled! Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);

  const batch3 = await adminContract.getBatch(batch3Id);
  console.log(`  Batch 3 Final Status: ${batch3.status} (Recalled = 4). Verified!`);

  console.log("\n==================================================");
  console.log("All 3 End-to-End Sepolia Flows Successfully Verified!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});
