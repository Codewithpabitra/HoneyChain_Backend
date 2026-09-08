# HoneyChain Documentation Hub

Welcome to the HoneyChain documentation repository. This directory serves as the centralized source of truth for all system architecture, API specifications, smart contract details, AI integration, and developer setup instructions.

---

> [!IMPORTANT]
> ### 🚨 API Documentation Maintenance Rule
> **Whenever any endpoint is added, removed, or modified in the codebase (`backend/src/routes/` or `backend/src/controllers/`), `docs/api.md` MUST be updated in the same commit / pull request.**  
> Keep paths, methods, request bodies, query params, response envelopes, and error codes in perfect parity with code.

---

## 📚 Documentation Directory

| Document | Description | Key Topics |
|---|---|---|
| 📡 **[API Reference](api.md)** | **Complete REST API Documentation** | 14 routes: Batch registration, quality certification, custody transfer, recall, QR generation, consumer verification, IoT telemetry ingest, AI/ML inference, and health probes. |
| 🏛️ **[System Architecture](architecture.md)** | **End-to-End System Design** | Multi-tier architecture, data flow diagrams, MongoDB vs. Ethereum Sepolia storage boundary, security and key isolation. |
| 🛠️ **[Developer Setup](setup.md)** | **Local Environment & Deployment** | Prerequisites, `.env` configurations, database seeding, test execution (`npm test`), and Render cloud deployment. |
| ⛓️ **[Smart Contract](contract.md)** | **Blockchain & Solidity Spec** | `HoneyChainRegistry.sol` methods, RBAC roles (`BEEKEEPER`, `LABORATORY`, `PROCESSOR`, `DISTRIBUTOR`, `AUDITOR`), emitted events, and Sepolia deployment records. |
| 🧠 **[AI / ML Integration](ml-integration.md)** | **Hive Health Inference Service** | Multi-tier LightGBM classifier (`T1`-`T48`), feature extraction, IST solar diurnal conversion, health diagnostic mapping, and latency optimizations. |
| ⚖️ **[Architecture Decisions (ADRs)](decisions.md)** | **Architectural Records** | Key engineering trade-offs: on-chain hashing vs full data, synchronous vs async ML inference, Express 5 migration, etc. |
| 📝 **[Changelog](changelog.md)** | **Development History** | Chronological record of features, deployments, and hackathon milestones. |

---

## 🚀 Quickstart for New Teammates

### 1. Repository Layout
```text
HoneyChain/
├── backend/            # Express REST API (TypeScript), MongoDB models, ethers.js Sepolia client
│   ├── src/            # Core backend logic (routes, controllers, services, models)
│   ├── ml/             # Embedded Python ML inference microservice & pre-trained model weights
│   └── test/           # Mocha/Chai automated test suite (67 unit & integration tests)
├── blockchain/         # Hardhat suite, Solidity contracts, deployment scripts
│   ├── contracts/      # HoneyChainRegistry.sol
│   └── deployments/    # Sepolia contract address & ABI
├── docs/               # System documentation (You are here)
└── frontend/           # Consumer QR verification single-page app (HTML/CSS/JS)
```

### 2. Five-Minute Setup
```bash
# 1. Clone the repository
git clone https://github.com/dhritish/HoneyChain_Backend.git
cd HoneyChain_Backend

# 2. Set up Backend
cd backend
npm install
cp .env.example .env     # Populate MONGODB_URI and Sepolia keys (ask teammate for secrets)

# 3. Run Automated Tests
npm test                # All 67 tests should pass

# 4. Start Local Development Server
npm run dev             # Starts API on http://localhost:5000

# 5. Start ML Inference Microservice (Optional for ML testing)
python3 -m venv venv
source venv/bin/activate
pip install -r ml/requirements.txt
python3 ml/inference_server.py  # Starts ML microservice on http://127.0.0.1:5001
```

### 3. Key Services & Links
- **Render Production Backend**: `https://honeychain-backend.onrender.com`
- **Consumer QR Verification UI**: `https://honeychain-backend.onrender.com/verify`
- **Sepolia Contract**: [`0x6331bEb93B6713e7Fca3d01Ff7871b6A5D2983bF`](https://sepolia.etherscan.io/address/0x6331bEb93B6713e7Fca3d01Ff7871b6A5D2983bF)
