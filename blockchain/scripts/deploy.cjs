const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("HoneyChainRegistry Deployment to Polygon Amoy");
  console.log("--------------------------------------------------");
  console.log("Deployer Address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer POL Balance:", hre.ethers.formatEther(balance), "POL");

  if (balance === 0n) {
    throw new Error(
      `Deployer wallet ${deployer.address} has 0 POL. Please fund it with testnet POL from an Amoy faucet before deploying.`
    );
  }

  console.log("\nDeploying HoneyChainRegistry...");
  const factory = await hre.ethers.getContractFactory("HoneyChainRegistry");
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

  // Save deployment artifact
  const deploymentsDir = path.join(__dirname, "../deployments/amoy");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/HoneyChainRegistry.sol/HoneyChainRegistry.json"
  );
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentData = {
    network: "Polygon Amoy",
    chainId: 80002,
    contractAddress,
    deployerAddress: deployer.address,
    deploymentTxHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
    abi: contractArtifact.abi,
  };

  const outputPath = path.join(deploymentsDir, "HoneyChainRegistry.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("Deployment artifact saved to:", outputPath);

  // Verification if Polygonscan API key exists
  if (process.env.POLYGONSCAN_API_KEY && process.env.POLYGONSCAN_API_KEY.trim() !== "") {
    console.log("\nInitiating Polygonscan verification...");
    try {
      // wait 5 confirmations before verification
      console.log("Waiting for 5 block confirmations for verification indexing...");
      await deploymentTx.wait(5);
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [deployer.address],
      });
      console.log("Contract successfully verified on Polygonscan!");
    } catch (err) {
      console.log("Polygonscan verification note:", err.message);
    }
  } else {
    console.log("\nNotice: POLYGONSCAN_API_KEY not set. Skipping automated contract verification.");
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
