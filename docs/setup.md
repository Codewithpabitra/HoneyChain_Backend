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

### 6.1 Deployer Wallet
The dedicated testnet deployment wallet for this environment is:
- **Deployer Public Address**: `0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08`
- **Current Balance**: `0.0 ETH`
- **State**: Pending testnet Sepolia ETH faucet funding.

### 6.2 Required Role Wallets
For multi-actor staging, dedicated testnet wallets should be configured in `blockchain/.env`:
- **`Admin`**: Receives `DEFAULT_ADMIN_ROLE` at contract construction (`deployer.address`).
- **`Beekeeper` (`BEEKEEPER_ADDRESS`)**: Authorized to call `registerBatch`.
- **`Laboratory` (`LABORATORY_ADDRESS`)**: Authorized to call `certifyBatch`.
- **`Processor` (`PROCESSOR_ADDRESS`)**: Authorized to accept and forward batch custody.
- **`Distributor` (`DISTRIBUTOR_ADDRESS`)**: Authorized to receive custody and distribute to retail.
- **`Auditor` (`AUDITOR_ADDRESS`)**: Authorized to inspect and execute safety recalls.

### 6.3 Deployment Commands
Once the deployer wallet is funded with testnet Sepolia ETH:

```bash
cd blockchain
npm run deploy:sepolia
```

To assign roles once addresses are configured in `blockchain/.env`:

```bash
cd blockchain
npm run roles:sepolia
```


