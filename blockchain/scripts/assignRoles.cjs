const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [admin] = await hre.ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("HoneyChainRegistry Role Assignment on Polygon Amoy");
  console.log("--------------------------------------------------");
  console.log("Admin / Signer Address:", admin.address);

  const deploymentPath = path.join(
    __dirname,
    "../deployments/amoy/HoneyChainRegistry.json"
  );
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "Deployment artifact not found at blockchain/deployments/amoy/HoneyChainRegistry.json. Please deploy first."
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployment.contractAddress;
  console.log("Target Contract Address:", contractAddress);

  const contract = await hre.ethers.getContractAt(
    "HoneyChainRegistry",
    contractAddress,
    admin
  );

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
      continue;
    }

    console.log(`Granting ${role.name} to ${role.address}...`);
    const tx = await contract.grantRole(role.constant, role.address);
    const receipt = await tx.wait(1);
    console.log(`[GRANTED] ${role.name} -> ${role.address} (tx: ${receipt.hash})`);
  }

  console.log("\nRole assignment processing complete.");
}

main().catch((error) => {
  console.error("Role assignment failed:", error);
  process.exitCode = 1;
});
