const { JsonRpcProvider, Wallet, parseEther, formatEther } = require("ethers");
require("dotenv").config({ path: "./.env" });

async function main() {
  const rpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new JsonRpcProvider(rpc);

  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing from environment.");
  }

  const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("--------------------------------------------------");
  console.log("HoneyChain Stakeholder Funding on Ethereum Sepolia");
  console.log("--------------------------------------------------");
  console.log("Source / Deployer Address:", deployer.address);

  const initialBalance = await provider.getBalance(deployer.address);
  console.log("Initial Deployer Balance:", formatEther(initialBalance), "ETH");

  const amountPerWallet = parseEther("0.003");
  const recipients = [
    { role: "BEEKEEPER", address: process.env.BEEKEEPER_ADDRESS },
    { role: "LABORATORY", address: process.env.LABORATORY_ADDRESS },
    { role: "PROCESSOR", address: process.env.PROCESSOR_ADDRESS },
    { role: "DISTRIBUTOR", address: process.env.DISTRIBUTOR_ADDRESS },
    { role: "AUDITOR", address: process.env.AUDITOR_ADDRESS },
  ];

  for (const recipient of recipients) {
    if (!recipient.address) {
      throw new Error(`Address for ${recipient.role} is not defined.`);
    }

    console.log(`\nSending 0.003 ETH to ${recipient.role} (${recipient.address})...`);
    const tx = await deployer.sendTransaction({
      to: recipient.address,
      value: amountPerWallet,
    });
    console.log(`Tx submitted: ${tx.hash}`);
    const receipt = await tx.wait(1);
    console.log(`[CONFIRMED] ${recipient.role} funded in block ${receipt.blockNumber} (tx: https://sepolia.etherscan.io/tx/${receipt.hash})`);
  }

  console.log("\n--------------------------------------------------");
  console.log("Post-Funding Balance Verification");
  console.log("--------------------------------------------------");
  for (const recipient of recipients) {
    const bal = await provider.getBalance(recipient.address);
    console.log(`${recipient.role} (${recipient.address}): ${formatEther(bal)} ETH`);
  }

  const finalDeployerBal = await provider.getBalance(deployer.address);
  console.log(`\nDeployer Remaining Balance: ${formatEther(finalDeployerBal)} ETH`);
}

main().catch((err) => {
  console.error("Funding failed:", err);
  process.exitCode = 1;
});
