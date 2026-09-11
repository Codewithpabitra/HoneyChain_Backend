const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("HoneyChainRegistry Deployment to Ethereum Sepolia");
  console.log("--------------------------------------------------");
  console.log("Deployer Address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Sepolia ETH Balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error(
      `Deployer wallet ${deployer.address} has 0 ETH. Please fund it with testnet ETH from a Sepolia faucet before deploying.`
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
  console.log("Sepolia Etherscan URL:", `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`);

  // Save deployment artifact
  const deploymentsDir = path.join(__dirname, "../deployments/sepolia");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/HoneyChainRegistry.sol/HoneyChainRegistry.json"
  );
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentData = {
    network: "Ethereum Sepolia",
    chainId: 11155111,
    contractAddress,
    deployerAddress: deployer.address,
    deploymentTxHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
    abi: contractArtifact.abi,
  };

  const outputPath = path.join(deploymentsDir, "HoneyChainRegistry.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("Deployment artifact saved to:", outputPath);

  // Verification if Etherscan API key exists
  if (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY.trim() !== "") {
    console.log("\nInitiating Sepolia Etherscan verification...");
    try {
      console.log("Waiting for 5 block confirmations for verification indexing...");
      await deploymentTx.wait(5);
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [deployer.address],
      });
      console.log("Contract successfully verified on Sepolia Etherscan!");
    } catch (err) {
      console.log("Sepolia Etherscan verification note:", err.message);
    }
  } else {
    console.log("\nNotice: ETHERSCAN_API_KEY not set. Skipping automated contract verification.");
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
