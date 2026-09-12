# HoneyChain Blockchain Subsystem

This directory contains the smart contracts, testing suites, and deployment scripts for the **HoneyChain** provenance registry.

## Network Target

- **Network**: Ethereum Sepolia Testnet
- **Chain ID**: 11155111
- **Currency Symbol**: Sepolia ETH
- **Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)
- **Default Public RPC**: `https://ethereum-sepolia-rpc.publicnode.com`

## Role-Based Access Control

The registry contract (`HoneyChainRegistry.sol`) enforces strict multi-role authorization:
- `ADMIN`: Contract administrator, manages authorized role addresses and emergency recalls.
- `BEEKEEPER`: Registers new honey harvest batches with hive and off-chain metadata hashes.
- `LABORATORY`: Certifies batches with lab analysis parameters and quality assurance hashes.
- `PROCESSOR`: Records processing, bottling, and packaging custody stages.
- `DISTRIBUTOR`: Handles logistics and distribution custody updates.
- `AUDITOR`: Independent regulatory or co-op verification role.

## Directory Structure

```text
blockchain/
├── contracts/          # Solidity smart contracts (HoneyChainRegistry.sol)
├── scripts/            # Deployment and operational scripts (deploy.cjs, assignRoles.cjs)
├── test/               # Unit and integration tests (Hardhat / Mocha / Chai)
├── deployments/        # Deployed contract artifacts (ABIs, addresses, tx hashes)
│   └── sepolia/
├── .env.example        # Environment variable template
└── README.md           # This document
```

## Commands

```bash
# Compile contracts
npm run compile

# Run local Hardhat test suite
npm test

# Deploy to Ethereum Sepolia (requires funded wallet and SEPOLIA_RPC_URL)
npm run deploy:sepolia

# Assign initial roles on Ethereum Sepolia
npm run roles:sepolia
```
