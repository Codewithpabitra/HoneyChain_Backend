require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts:
        process.env.DEPLOYER_PRIVATE_KEY &&
        process.env.DEPLOYER_PRIVATE_KEY !==
          "0x0000000000000000000000000000000000000000000000000000000000000000"
          ? [process.env.DEPLOYER_PRIVATE_KEY]
          : [],
      chainId: 80002,
    },
  },
};
