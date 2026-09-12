require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://ethereum-sepolia-rpc.publicnode.com",
      accounts:
        (process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY) &&
        (process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY) !==
          "0x0000000000000000000000000000000000000000000000000000000000000000"
          ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY]
          : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};
