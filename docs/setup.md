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

### 6.2 Stakeholder Role Wallets & Funding Status
Dedicated testnet wallets have been generated, authorized on-chain, and funded for demo execution:

| Role | Public Address | Assignment Tx | Funding Tx (0.003 ETH) | Balance |
|---|---|---|---|---|
| **Admin** | `0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08` | (Contract Constructor) | (Faucet Funded) | `0.03337 ETH` |
| **Beekeeper** | `0x111748e2D54D3f151746Af8B508CE8AD626d7A93` | [`0xde96...`](https://sepolia.etherscan.io/tx/0xde96e9b83796d57746895479e7c4880d74fdc0f2a48fb5f4f0febfeff9c4fce9) | [`0x6a2d...`](https://sepolia.etherscan.io/tx/0x6a2d5f274919d1b7701a2d8d223a1de230347a1ce71d086d053ae6fe35dbe563) | `0.00300 ETH` |
| **Laboratory** | `0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c` | [`0x96d8...`](https://sepolia.etherscan.io/tx/0x96d8ac1517b6a3eb2da9cc9ee749677e30547b9b69f9a4d94d51c2f4a0007fa9) | [`0xc890...`](https://sepolia.etherscan.io/tx/0xc890ea91c6c8c4ac471d0757e5269e868c848fe3c5053b307580337f6e11870c) | `0.00300 ETH` |
| **Processor** | `0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34` | [`0x27b4...`](https://sepolia.etherscan.io/tx/0x27b494f4c1f8faf5f8798e99c6cd30151c16b13b4b66ea63aa4bb6bba3a3626c) | [`0x5b46...`](https://sepolia.etherscan.io/tx/0x5b46bb02bc4bd2640295d2d7d74ffab3c4c7ada4345a4ca9b476163dfb9a057d) | `0.00300 ETH` |
| **Distributor** | `0x3003D5104621e8DD31c8c70DFFAa59816400D2D9` | [`0x51c6...`](https://sepolia.etherscan.io/tx/0x51c6fb33e01dc0d6d870fe47c16eaf833ebc96c9edbb5ea720789b73af048a18) | [`0x0b35...`](https://sepolia.etherscan.io/tx/0x0b35bfcb6b910ddfd2d4c2e6c3193608a0059940f5fc88d3f75bdb345aa0413b) | `0.00300 ETH` |
| **Auditor** | `0x09C1d432f79fB1Dad516bf688930aAB81aA0978a` | [`0xd7e1...`](https://sepolia.etherscan.io/tx/0xd7e162e7fbae0b240913b89524ac7b2eb735461993125c8aae8f2f8fe998a394) | [`0x86c9...`](https://sepolia.etherscan.io/tx/0x86c9afeb099868d8de4f949c9bb06d52ba72dcf929b889d56dfa92849ca707be) | `0.00300 ETH` |

### 6.3 Operational Commands
```bash
cd blockchain

# Re-run role verification/assignment
npm run roles:sepolia

# Fund stakeholder wallets from deployer
npm run fund:stakeholders
```

---

## 7. MongoDB Setup, Seeding & Testing

### 7.1 Database Connection Configuration
The backend uses a production-quality connection pool managed via `backend/src/config/db.ts`.

Configure your connection string in `backend/.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/honeychain?retryWrites=true&w=majority
```
> [!NOTE]
> All connection logs automatically mask credentials using `sanitizeMongoUri(...)` to avoid leaking passwords in standard output.

### 7.2 Database Models Overview
| Model | Collection | Primary Responsibility | Key Indexes |
|---|---|---|---|
| **`Apiary`** | `apiaries` | Physical beekeeping sanctuaries | `{ apiaryId: 1 }` (unique), `{ beekeeper: 1 }`, `{ "location.coordinates": "2dsphere" }` |
| **`Hive`** | `hives` | Individual monitored hives & queens | `{ hiveId: 1 }` (unique), `{ apiary: 1 }`, `{ "deviceMetadata.deviceId": 1 }` |
| **`SensorReading`** | `sensorreadings` | Time-series telemetry from IoT gateways | `{ hiveId: 1, timestamp: -1 }`, `{ deviceId: 1, timestamp: -1 }`, `{ timestamp: -1 }` |
| **`Batch`** | `batches` | Harvest batches & provenance anchors | `{ batchId: 1 }` (unique), `{ producer: 1 }`, `{ status: 1 }` |
| **`AIPrediction`** | `aipredictions` | Analytics, swarming risk, yield forecasts | `{ predictionId: 1 }` (unique), `{ hiveId: 1, predictionTimestamp: -1 }`, `{ predictionType: 1 }` |

### 7.3 Seeding Realistic Development Data
An idempotent, safely repeatable seed script is provided to populate realistic apiaries, monitored hives, 24-hour time-series telemetry streams, AI predictions, and sample honey batches:

```bash
cd backend
npm run seed
```

### 7.4 Running Test Suites
Run the unified test suite (covering both MongoDB data layer and Ethereum Sepolia integration):
```bash
cd backend
npm test
```

### 7.5 Running the Development API Server
Start the Express server with live TypeScript reload:
```bash
cd backend
npm run dev
```
Server boots on `http://localhost:5000` with graceful shutdown handling on `SIGINT` / `SIGTERM`.

---

## 8. IoT Telemetry Ingestion & Integrated Simulator

### 8.1 Ingestion Endpoints & Integrated Frontend
- **`GET /`**: Serves the HoneyChain browser frontend dashboard for provenance verification, system health status, and monitored hive telemetry. If requested with `Accept: application/json`, returns API service metadata.
- **`GET /health`**: Ingestion node health check.
  - Returns `status`, `uptimeSeconds`, `timestamp`, and `database.status` (`connected`, `connecting`, `disconnected`).
  - Zero sensitive database URIs or credentials leaked.
- **`POST /api/iot/telemetry`**: Ingests environmental and acoustic sensor readings.
  - Required fields: `deviceId`, `hiveId`, `timestamp`, `metrics: { temperature, humidity, weightKg }`.
  - Optional fields: `soundFrequencyHz`, `acousticsDb`, `batteryLevelPct`, `ambientTemperature`, `ambientHumidity`, `metadata`.
  - Automatic deduplication on `deviceId + timestamp` (returns `HTTP 200` with `{ duplicate: true }`).

### 8.2 Single-Server Architecture & Self-Hitting IoT Simulator
HoneyChain deploys as a **single unified server** (Express backend). The backend serves the web interface, processes API requests, and runs an integrated background telemetry simulation service that periodically fires HTTP POST requests to its own public/deployed URL:

**Environment Variables**:
- `IOT_TARGET_URL`: The URL that the backend hits to send telemetry.
  - In development: Leave empty (`IOT_TARGET_URL=`). The backend will boot normally, logging that the integrated simulator is idle.
  - In local testing: Set `IOT_TARGET_URL=http://localhost:5000`.
  - On Render: Set `IOT_TARGET_URL=https://<your-service-name>.onrender.com`.
- `IOT_INTERVAL_MS` *(optional)*: Telemetry transmission interval in milliseconds (defaults to `600000` / 10 minutes; can be set to `5000` or `10000` for rapid testing).

### 8.3 Render Deployment Runbook (Separate Backend & Frontend Services)

HoneyChain is deployed as **two independent Render Web Services** from this same GitHub repository.

---

#### Service 1: Backend API (`honeychain-backend`)

In your [Render Dashboard](https://dashboard.render.com/):
1. Click **New +** → **Web Service**.
2. Select your repository: `Codewithpabitra/HoneyChain_Backend`.
3. Configure parameters:
   | Setting | Value to Enter |
   |---|---|
   | **Name** | `honeychain-backend` |
   | **Region** | Closest region (e.g. Frankfurt, Singapore, Ohio) |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free or Starter |
   | **Health Check Path** | `/health` |

4. Add Backend Environment Variables:
   | Key | Value to Paste | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port injected by Render |
   | `MONGO_URI` | *(MongoDB Atlas Connection String)* | Database URI |
   | `SEPOLIA_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` | Sepolia RPC |
   | `CONTRACT_ADDRESS` | `0x65afF3B44441FfF68171a9a0AA28063BC83C208d` | Sepolia smart contract |
   | `DEPLOYER_PRIVATE_KEY` | *(Deployer Key)* | Testnet wallet |
   | `BEEKEEPER_PRIVATE_KEY` | *(Beekeeper Key)* | Testnet wallet |
   | `LABORATORY_PRIVATE_KEY`| *(Laboratory Key)* | Testnet wallet |
   | `PROCESSOR_PRIVATE_KEY` | *(Processor Key)* | Testnet wallet |
   | `DISTRIBUTOR_PRIVATE_KEY`| *(Distributor Key)* | Testnet wallet |
   | `AUDITOR_PRIVATE_KEY`   | *(Auditor Key)* | Testnet wallet |
   | `FRONTEND_URL`          | `https://honeychain-frontend.onrender.com` | **Frontend URL for CORS & cookies** |
   | `PUBLIC_BASE_URL`       | `https://honeychain-frontend.onrender.com` | **Frontend verification URL for QR codes** |
   | `ML_SERVICE_URL`        | `https://honeychain-ml.onrender.com` | Optional ML microservice |

---

#### Service 2: Frontend Web App (`honeychain-frontend`)

In your [Render Dashboard](https://dashboard.render.com/):
1. Click **New +** → **Web Service**.
2. Select the same repository: `Codewithpabitra/HoneyChain_Backend`.
3. Configure parameters:
   | Setting | Value to Enter |
   |---|---|
   | **Name** | `honeychain-frontend` |
   | **Region** | Same region as backend |
   | **Branch** | `main` |
   | **Root Directory** | `frontend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free or Starter |

4. Add Frontend Environment Variables:
   | Key | Value to Paste | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `NEXT_PUBLIC_API_URL` | `https://honeychain-backend.onrender.com` | **URL of your deployed backend service** |

> [!TIP]
> **Order of Deployment**:
> 1. Create the backend service first. Note the assigned URL (e.g. `https://honeychain-backend-trag.onrender.com`).
> 2. Create the frontend service, setting `NEXT_PUBLIC_API_URL` to your backend URL. Note the assigned frontend URL (e.g. `https://honeychain-frontend-x7q9.onrender.com`).
> 3. Go to the backend service **Environment** tab, set `FRONTEND_URL` and `PUBLIC_BASE_URL` to your frontend URL, and click **Save Changes**. Cross-origin CORS, cookies, and consumer QR codes will now bind seamlessly!

### 8.4 Standalone CLI Simulator (Optional)
If you ever want to run an extra simulated gateway stream locally from the terminal:
```bash
cd backend
IOT_TARGET_URL=http://localhost:5000 IOT_INTERVAL_MS=5000 npm run simulate:iot
```






