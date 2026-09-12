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
2. **AI Colony Health Diagnostics**: Communicates via HTTP/HTTPS with the independent Python ML microservice (`HoneyChain_ML`) across tiers `T1` through `T48`, converting timestamps to Indian Standard Time (IST) for diurnal solar alignment.
3. **Ethereum Sepolia Provenance**: Uses `ethers.js` (v6) to register honey batches, record lab quality certifications, transfer custody, issue recalls, and verify SHA-256 cryptographic hashes for anti-tamper consumer verification.

---

## Directory Structure

```text
backend/
├── src/
│   ├── app.ts                  # Express application setup & middleware
│   ├── server.ts               # Server entry point & graceful shutdown
│   ├── config/                 # Environment variables & MongoDB connection
│   ├── controllers/            # Route handlers (auth, batch, iot, ml)
│   ├── middlewares/            # Error handling, CORS, JWT & RBAC authentication
│   ├── models/                 # Mongoose schemas (Batch, Hive, SensorReading, AIPrediction, User, Organization)
│   ├── routes/                 # Express REST route definitions
│   ├── services/               # Core business logic (blockchain, ML client, QR, auth)
│   ├── scripts/                # Database seeding & simulation utilities
│   ├── tests/                  # Mocha & Chai automated test suites (90 tests)
│   └── utils/                  # AppError class & helpers
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
All 90 tests should pass cleanly (Auth, Batch, IoT, ML Resilience, Models, QR).

### 4. Start Development Server
```bash
npm run dev
```
Starts the API on `http://localhost:5000` with hot-reloading via `tsx`.

### 5. Running the ML Microservice (Optional for local AI inference)
In the standalone repository directory (`../HoneyChain_ML`):
```bash
cd ../HoneyChain_ML
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 service.py
```
Starts independent ML microservice on `http://localhost:5001`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts backend development server with hot-reload |
| `npm run build` | Compiles TypeScript to `dist/` (zero Python dependency) |
| `npm start` | Runs compiled production server (`node dist/server.js`) |
| `npm test` | Executes Mocha test suite (90 tests) |
| `npm run test:watch` | Runs test runner in watch mode |
| `npm run seed` | Seeds initial apiaries, hives, mock sensor data, and demo users |
| `npm run seed:users` | Seeds 6 demo organizations and users across all stakeholder roles |
| `npm run simulate:iot` | Runs continuous or one-off IoT telemetry simulation |
| `npm run demo:rehearsal`| Seeds demo batches and triggers full verification flow |

---

## Documentation Links
- 📡 [API Documentation Reference (`../docs/api.md`)](../docs/api.md)
- 📚 [Central Documentation Hub (`../docs/README.md`)](../docs/README.md)
- 🏛️ [System Architecture (`../docs/architecture.md`)](../docs/architecture.md)
