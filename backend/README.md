# HoneyChain Backend Service

> **Core Node.js/Express (v5) backend for the HoneyChain apiculture monitoring and Ethereum Sepolia honey provenance platform.**

---

> [!IMPORTANT]
> ### 🚨 API Documentation Maintenance Rule
> Whenever any endpoint is created, removed, or modified in `src/routes/` or `src/controllers/`, **the API specification at [`../docs/api.md`](../docs/api.md) MUST be updated immediately** in the same pull request or commit.

---

## Overview

The HoneyChain backend coordinates three distinct subsystems:
1. **IoT Telemetry Ingestion**: Ingests sensor readings (temperature, humidity, acoustics, weight, battery) from apiary gateways with boundary validation and idempotency.
2. **AI Colony Health Diagnostics**: Calls an embedded Python multi-tier LightGBM microservice (`ml/inference_server.py`) across tiers `T1` through `T48`, converting timestamps to Indian Standard Time (IST) for diurnal solar alignment.
3. **Ethereum Sepolia Provenance**: Uses `ethers.js` (v6) to register honey batches, record lab quality certifications, transfer custody, issue recalls, and verify SHA-256 cryptographic hashes for anti-tamper consumer verification.

---

## Directory Structure

```text
backend/
├── src/
│   ├── app.ts                  # Express application setup & middleware
│   ├── server.ts               # Server entry point & graceful shutdown
│   ├── config/                 # Environment variables & MongoDB connection
│   ├── controllers/            # Route handlers (batch, iot, ml)
│   ├── middlewares/            # Error handling, CORS, authentication
│   ├── models/                 # Mongoose schemas (Batch, Hive, SensorReading, AIPrediction)
│   ├── routes/                 # Express REST route definitions
│   ├── services/               # Core business logic (blockchain, ML, QR)
│   ├── scripts/                # Database seeding & simulation utilities
│   └── utils/                  # AppError class & helpers
├── ml/                         # Python ML inference service & pre-trained model weights
│   ├── inference_server.py     # HTTP inference server (port 5001)
│   ├── predict.py              # Feature engineering & LightGBM prediction
│   ├── model/                  # Multi-tier model artifacts (T1 - T48)
│   └── requirements.txt        # Python dependencies (lightgbm, numpy, pandas)
├── test/                       # Mocha & Chai automated test suites (67 tests)
├── .env.example                # Template environment configuration
├── package.json                # NPM scripts and dependencies
└── tsconfig.json               # TypeScript compiler options
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the template and configure your environment variables:
```bash
cp .env.example .env
```
Ensure you provide:
- `MONGODB_URI`: MongoDB Atlas connection string.
- `SEPOLIA_RPC_URL`: Ethereum Sepolia RPC URL (e.g., Alchemy / Infura).
- `CONTRACT_ADDRESS`: Deployed `HoneyChainRegistry` address (`0x6331bEb93B6713e7Fca3d01Ff7871b6A5D2983bF`).
- Role private keys (`BEEKEEPER_PRIVATE_KEY`, `LAB_PRIVATE_KEY`, `AUDITOR_PRIVATE_KEY`, etc.).

### 3. Run Automated Tests
```bash
npm test
```
All 67 tests should pass cleanly.

### 4. Start Development Server
```bash
npm run dev
```
Starts the API on `http://localhost:5000` with hot-reloading via `tsx`.

### 5. Start Python ML Microservice (Optional for local AI inference)
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r ml/requirements.txt
python3 ml/inference_server.py
```
Starts internal ML inference server on `http://127.0.0.1:5001`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts backend development server with hot-reload |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs compiled production server (`node dist/server.js`) |
| `npm test` | Executes Mocha test suite |
| `npm run test:watch` | Runs test runner in watch mode |
| `npm run seed` | Seeds initial apiaries, hives, and mock sensor data |
| `npm run simulate:iot` | Runs continuous or one-off IoT telemetry simulation |
| `npm run demo:rehearsal`| Seeds demo batches and triggers full verification flow |

---

## Documentation Links
- 📡 [API Documentation Reference (`../docs/api.md`)](../docs/api.md)
- 📚 [Central Documentation Hub (`../docs/README.md`)](../docs/README.md)
- 🏛️ [System Architecture (`../docs/architecture.md`)](../docs/architecture.md)
