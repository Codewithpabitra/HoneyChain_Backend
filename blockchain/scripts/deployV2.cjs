const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("==================================================");
  console.log("HoneyChainRegistryV2 Deployment to Ethereum Sepolia");
  console.log("==================================================");
  console.log("Deployer Address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Sepolia ETH Balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error(
      `Deployer wallet ${deployer.address} has 0 ETH. Please fund it with testnet ETH before deploying.`
    );
  }

  console.log("\nDeploying HoneyChainRegistryV2...");
  const factory = await hre.ethers.getContractFactory("HoneyChainRegistryV2");
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  const receipt = await deploymentTx.wait(1);

  console.log("\nDeployment Successful!");
  console.log("Contract Address:", contractAddress);
  console.log("Transaction Hash:", deploymentTx.hash);
  console.log("Block Number:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);

  // Role Assignment
  console.log("\nAssigning Roles to Stakeholders...");
  const roles = [
    {
      name: "BEEKEEPER_ROLE",
      constant: await contract.BEEKEEPER_ROLE(),
      address: process.env.BEEKEEPER_ADDRESS,
    },
    {
      name: "LABORATORY_ROLE",
      constant: await contract.LABORATORY_ROLE(),
      address: process.env.LABORATORY_ADDRESS,
    },
    {
      name: "PROCESSOR_ROLE",
      constant: await contract.PROCESSOR_ROLE(),
      address: process.env.PROCESSOR_ADDRESS,
    },
    {
      name: "DISTRIBUTOR_ROLE",
      constant: await contract.DISTRIBUTOR_ROLE(),
      address: process.env.DISTRIBUTOR_ADDRESS,
    },
    {
      name: "AUDITOR_ROLE",
      constant: await contract.AUDITOR_ROLE(),
      address: process.env.AUDITOR_ADDRESS,
    },
  ];

  const roleAssignments = {};

  for (const role of roles) {
    if (!role.address || role.address.trim() === "") {
      console.log(`[SKIP] ${role.name}: No address provided in environment.`);
      continue;
    }

    if (!hre.ethers.isAddress(role.address)) {
      console.warn(`[WARN] ${role.name}: '${role.address}' is not a valid address.`);
      continue;
    }

    const alreadyGranted = await contract.hasRole(role.constant, role.address);
    if (alreadyGranted) {
      console.log(`[OK] ${role.name}: Address ${role.address} already has role.`);
      roleAssignments[role.name] = { address: role.address, txHash: "already-granted" };
      continue;
    }

    console.log(`Granting ${role.name} to ${role.address}...`);
    const tx = await contract.grantRole(role.constant, role.address);
    const grantReceipt = await tx.wait(1);
    console.log(`[GRANTED] ${role.name} -> ${role.address} (tx: ${grantReceipt.hash})`);
    roleAssignments[role.name] = { address: role.address, txHash: grantReceipt.hash };
  }

  // Save deployment artifact
  const deploymentsDir = path.join(__dirname, "../deployments/sepolia");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/HoneyChainRegistryV2.sol/HoneyChainRegistryV2.json"
  );
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentData = {
    contractName: "HoneyChainRegistryV2",
    network: "Ethereum Sepolia",
    chainId: 11155111,
    contractAddress,
    deployerAddress: deployer.address,
    deploymentTxHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
    roles: roleAssignments,
    abi: contractArtifact.abi,
  };

  const outputPath = path.join(deploymentsDir, "HoneyChainRegistryV2.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\nDeployment artifact saved to:", outputPath);

  // Also copy to backend deployments directory
  const backendDeploymentsDir = path.join(__dirname, "../../backend/src/deployments");
  fs.mkdirSync(backendDeploymentsDir, { recursive: true });
  const backendOutputPath = path.join(backendDeploymentsDir, "HoneyChainRegistryV2.json");
  fs.writeFileSync(backendOutputPath, JSON.stringify(deploymentData, null, 2));
  console.log("Copied deployment artifact to backend:", backendOutputPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
