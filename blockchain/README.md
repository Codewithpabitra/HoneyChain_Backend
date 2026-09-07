# HoneyChain Blockchain Subsystem

This directory contains the smart contracts, testing suites, and deployment scripts for the **HoneyChain** provenance registry.

## Network Target

- **Network**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **Currency Symbol**: POL
- **Explorer**: [Polygonscan Amoy](https://amoy.polygonscan.com/)
- **Default Public RPC**: `https://rpc-amoy.polygon.technology/`

## Role-Based Access Control

The upcoming registry contract (`HoneyChainRegistry.sol`) enforces strict multi-role authorization:
- `ADMIN`: Contract administrator, manages authorized role addresses.
- `BEEKEEPER`: Registers new honey harvest batches with hive and off-chain metadata hashes.
- `LABORATORY`: Certifies batches with lab analysis parameters and quality assurance hashes.
- `PROCESSOR`: Records processing, bottling, and packaging custody stages.
- `DISTRIBUTOR`: Handles logistics and distribution custody updates.
- `AUDITOR`: Independent regulatory or co-op verification role.

## Directory Structure

```text
blockchain/
├── contracts/          # Solidity smart contracts (HoneyChainRegistry.sol - Phase 1)
├── scripts/            # Deployment and operational scripts
├── test/               # Unit and integration tests (Hardhat / Mocha / Chai)
├── deployments/        # Deployed contract artifacts (ABIs, addresses, tx hashes)
│   └── amoy/
├── .env.example        # Environment variable template
└── README.md           # This document
```

> **Note**: In Phase 0, the blockchain folder is initialized as a structural foundation. Smart contract code, Hardhat toolchain configuration, and deployment scripts will be implemented in subsequent phases.
