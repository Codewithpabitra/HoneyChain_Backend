# HoneyChain

> **Smart India Hackathon 2026 Prototype**  
> AI & IoT-based Honeybee Monitoring and Polygon Blockchain Honey Traceability

HoneyChain bridges the gap between rural beekeepers and modern consumers. The system integrates IoT hive sensors for real-time bee colony health monitoring, AI microservices for predictive colony diagnostics, and the **Polygon Amoy** blockchain for immutable, tamper-resistant honey batch provenance and anti-adulteration verification.

---

## Repository Structure

```text
HoneyChain/
├── backend/            # Express REST API, MongoDB models, MQTT ingestion, ethers.js client
│   ├── src/            # Application source code
│   ├── docs/           # Backend-specific documentation
│   ├── .env.example    # Backend environment variable template
│   ├── package.json    # Backend dependencies and scripts
│   └── tsconfig.json   # TypeScript configuration
├── blockchain/         # Polygon Amoy smart contracts and Hardhat development suite
│   ├── contracts/      # Solidity smart contracts (HoneyChainRegistry.sol)
│   ├── scripts/        # Deployment and interaction scripts
│   ├── test/           # Smart contract test suites
│   ├── deployments/    # Network deployment records (addresses, ABIs, tx hashes)
│   ├── .env.example    # Blockchain environment variable template
│   └── README.md       # Blockchain subsystem overview
├── docs/               # System documentation and architecture records
│   ├── architecture.md # End-to-end system design and data flow
│   ├── decisions.md    # Architecture Decision Records (ADRs)
│   ├── setup.md        # Environment setup and developer instructions
│   └── changelog.md    # Phase-by-phase project changelog
├── .gitignore          # Repository-wide ignore rules
└── README.md           # Master repository overview (this document)
```

---

## Subsystem Responsibilities

### 1. `backend/` (Operational Core)
- **REST APIs**: Serves client requests from web portals and mobile apps.
- **MQTT Ingestion**: Receives telemetry streams from ESP32 apiary gateways.
- **Operational Database (MongoDB)**: Stores high-frequency sensor readings, hive telemetry, user authentication, apiary records, and laboratory report files.
- **AI Integration**: Coordinates with external ML models for colony stress detection, disease warning, and honey yield forecasting.
- **Blockchain Client (`ethers.js`)**: Securely interfaces with Polygon Amoy to register batches, record custody updates, attest lab certifications, and query event logs for verification.

### 2. `blockchain/` (Immutable Provenance Ledger)
- **Network**: Polygon Amoy Testnet (Chain ID `80002`, Gas token `POL`).
- **Role-Based Access Control**: Enforces strict authorization directly on-chain for `ADMIN`, `BEEKEEPER`, `LABORATORY`, `PROCESSOR`, `DISTRIBUTOR`, and `AUDITOR`.
- **Minimal On-Chain Footprint**: Stores only cryptographic anchors (metadata SHA-256 hashes, lab certificate hashes, custodian addresses, quality grades, batch status). Does **not** store raw telemetry or binary documents.
- **Event-Driven Auditability**: Emits indexed events (`BatchRegistered`, `BatchCertified`, `CustodyTransferred`, `BatchRecalled`) allowing instant reconstruction of a honey batch journey via Polygon RPC.

### 3. `docs/` (System Truth & Specifications)
- Centralized, version-controlled documentation repository.
- Contains system architecture diagrams, ADRs, developer setup steps, and progress changelogs.

---

## Communication: Backend ↔ Blockchain

The Express backend connects to Polygon Amoy using **`ethers.js` (v6)** over standard JSON-RPC:
- **Write Operations (Transactions)**: Backend loads role-specific server-side private keys (e.g. Beekeeper wallet for batch registration, Laboratory wallet for certification), estimates gas, signs transactions, and broadcasts to Polygon Amoy. Transaction hashes and block confirmations are recorded in MongoDB.
- **Read Operations (Event Filtering & Verification)**: When a consumer scans a QR code, the backend queries the contract view method `getBatch()` and filters historical EVM event logs (`queryFilter`) to build the chronological lifecycle timeline directly from the blockchain.

---

## Security & Secrets Management

- **Isolated `.env` Files**: Secrets are stored in subsystem-specific `.env` files (`backend/.env` and `blockchain/.env`).
- **Strict `.gitignore`**: All `.env` files, private keys (`*.key`, `*.pem`), and build outputs (`artifacts/`, `cache/`, `dist/`) are strictly ignored by Git. Only template `.env.example` files are committed.
- **Server-Side Key Isolation**: Private keys are restricted to server-side memory, never logged, and never returned across API endpoints to frontend clients.
- **Testnet-Only Wallets**: Development uses dedicated Polygon Amoy testnet wallets with zero real-world monetary value.

---

## Quick Reference Links

- [System Architecture](docs/architecture.md)
- [Architecture Decisions (ADRs)](docs/decisions.md)
- [Developer Setup Guide](docs/setup.md)
- [Changelog](docs/changelog.md)