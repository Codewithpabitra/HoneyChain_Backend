# HoneyChain Setup Guide

This guide describes how to configure the local development environment and subsystems for HoneyChain.

---

## 1. Prerequisites

Ensure your development workstation has the following installed:
- **Node.js**: v20.x or v22.x LTS
- **npm** (v10+) or **pnpm**
- **Git**
- **MongoDB**: Local MongoDB instance (v6.0+) or MongoDB Atlas URI

---

## 2. Repository Layout

The repository is modularly structured:

```text
HoneyChain/
├── backend/            # Express REST API, MongoDB models, MQTT listener, ethers.js client
├── blockchain/         # Hardhat project, Solidity contracts, Ethereum Sepolia deployment scripts
├── docs/               # Architecture, ADRs, Setup, Changelog
├── .gitignore          # Root ignore rules for build outputs and credentials
└── README.md           # Master project overview
```

---

## 3. Environment Variables & Secrets Management

To guarantee isolation and prevent accidental leaks, secrets and configuration parameters are divided per subsystem:

### 3.1 Backend Configuration (`backend/.env`)
Create `backend/.env` from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Key variables configured:
- `PORT`: Server port (e.g., `5000`)
- `NODE_ENV`: `development` | `production` | `test`
- `MONGO_URI`: MongoDB connection string (`mongodb://localhost:27017/honeychain`)
- `MQTT_BROKER_URL`: MQTT broker address (`mqtt://localhost:1883`)
- `JWT_SECRET`: Secret key for session authentication
- `SEPOLIA_RPC_URL`: Ethereum Sepolia RPC endpoint
- `CONTRACT_ADDRESS`: Deployed `HoneyChainRegistry` contract address
- `ADMIN_PRIVATE_KEY`: Server-side dedicated testnet private key for Admin actions
- `BEEKEEPER_PRIVATE_KEY`: Dedicated testnet key for beekeeper batch registration demo
- `LAB_PRIVATE_KEY`: Dedicated testnet key for laboratory certification demo

### 3.2 Blockchain Configuration (`blockchain/.env`)
Create `blockchain/.env` from `blockchain/.env.example`:

```bash
cp blockchain/.env.example blockchain/.env
```

Key variables configured:
- `SEPOLIA_RPC_URL`: Ethereum Sepolia RPC endpoint (e.g. `https://ethereum-sepolia-rpc.publicnode.com` or provider URL)
- `DEPLOYER_PRIVATE_KEY`: Dedicated testnet wallet private key (funded with Sepolia ETH)
- `ETHERSCAN_API_KEY`: API key for verifying contracts on Sepolia Etherscan

---

## 4. Keeping Secrets Safe

1. **Strict Git Ignore**: Both `.env` and `**/.env` are matched in the root `.gitignore`. Never use `git add -f` on any `.env` file.
2. **Dedicated Testnet Wallets**: Only use throwaway wallets generated specifically for the Ethereum Sepolia testnet. Never reuse a mainnet private key or personal wallet containing real assets.
3. **Zero Frontend Exposure**: Server-side private keys are strictly loaded into backend memory via `process.env`. They are never exposed via REST API responses, never rendered on client portals, and never printed in application logs.
4. **Log Redaction**: Production logging libraries (Pino) are configured to mask sensitive fields like private keys, passwords, and tokens.

---

## 5. Ethereum Sepolia Network & Faucet Details

- **Network Name**: Ethereum Sepolia Testnet
- **RPC URL**: `https://ethereum-sepolia-rpc.publicnode.com` (or Alchemy/Infura Sepolia endpoint)
- **Chain ID**: `11155111`
- **Currency Symbol**: `Sepolia ETH`
- **Block Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)
- **Faucets**:
  - [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) (Fast, no captcha)
  - [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
  - [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/)
  - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

---

## 6. Deployment & Role Setup Runbook

### 6.1 Deployed Contract (Ethereum Sepolia)
- **Contract Address**: `0x65afF3B44441FfF68171a9a0AA28063BC83C208d`
- **Deployment Transaction**: [`0x59d3d3f5cd1cc37984c17358ae0e071226cafd5b7c423739d5f2a3bf9243dde2`](https://sepolia.etherscan.io/tx/0x59d3d3f5cd1cc37984c17358ae0e071226cafd5b7c423739d5f2a3bf9243dde2)
- **Block Number**: `11655688`
- **Gas Used**: `1,118,315`
- **Deployer / Admin Address**: `0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08`
- **Deployment Artifact**: `blockchain/deployments/sepolia/HoneyChainRegistry.json`

### 6.2 Stakeholder Role Wallets & Assignment Verification
Dedicated testnet wallets have been generated and authorized on-chain:

| Role | Public Address | Assignment Tx Hash | Status |
|---|---|---|---|
| **Admin** | `0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08` | (Contract Constructor) | Confirmed |
| **Beekeeper** | `0x111748e2D54D3f151746Af8B508CE8AD626d7A93` | [`0xde96e9b83796d57746895479e7c4880d74fdc0f2a48fb5f4f0febfeff9c4fce9`](https://sepolia.etherscan.io/tx/0xde96e9b83796d57746895479e7c4880d74fdc0f2a48fb5f4f0febfeff9c4fce9) | Confirmed |
| **Laboratory** | `0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c` | [`0x96d8ac1517b6a3eb2da9cc9ee749677e30547b9b69f9a4d94d51c2f4a0007fa9`](https://sepolia.etherscan.io/tx/0x96d8ac1517b6a3eb2da9cc9ee749677e30547b9b69f9a4d94d51c2f4a0007fa9) | Confirmed |
| **Processor** | `0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34` | [`0x27b494f4c1f8faf5f8798e99c6cd30151c16b13b4b66ea63aa4bb6bba3a3626c`](https://sepolia.etherscan.io/tx/0x27b494f4c1f8faf5f8798e99c6cd30151c16b13b4b66ea63aa4bb6bba3a3626c) | Confirmed |
| **Distributor** | `0x3003D5104621e8DD31c8c70DFFAa59816400D2D9` | [`0x51c6fb33e01dc0d6d870fe47c16eaf833ebc96c9edbb5ea720789b73af048a18`](https://sepolia.etherscan.io/tx/0x51c6fb33e01dc0d6d870fe47c16eaf833ebc96c9edbb5ea720789b73af048a18) | Confirmed |
| **Auditor** | `0x09C1d432f79fB1Dad516bf688930aAB81aA0978a` | [`0xd7e162e7fbae0b240913b89524ac7b2eb735461993125c8aae8f2f8fe998a394`](https://sepolia.etherscan.io/tx/0xd7e162e7fbae0b240913b89524ac7b2eb735461993125c8aae8f2f8fe998a394) | Confirmed |

### 6.3 Operational Commands
To re-run or inspect role assignments:

```bash
cd blockchain
npm run roles:sepolia
```


