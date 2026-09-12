# HoneyChain Changelog

All notable changes to the HoneyChain backend and blockchain subsystems will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Phase 10: Regulatory Food Safety Authority Portal, Role Separation & Refresh UX] - 2026-09-12

### Added
- **Regulatory Food Safety Authority Portal (`frontend/src/app/(authority)/authority/audits/page.tsx`)**:
  - Dedicated operational portal for Food Safety & Licensing Authorities (e.g., FSSAI / Food License Committee members).
  - Filter tabs: `NEEDS_AUDIT` (batches requiring regulatory inspection), `CERTIFIED` (passed quality standards), `RECALLED` (withdrawn from commercial chain), and `ALL`.
  - On-chain Action Modals:
    - **Pass Audit**: Approves flagged batches and clears pending reviews (`POST /api/batches/:batchId/review-request/:requestId/clear`) with optional regulatory inspection notes.
    - **Execute Batch Recall**: Enforces immediate on-chain batch recall (`POST /api/batches/:batchId/recall`) requiring an official legal and public health justification.
  - Direct links to tamper-proof PDF laboratory assay reports (`resolveLabReportUrl`) and decentralized supply chain traceability.
- **Auditor vs. Admin Role Separation**:
  - Clarified role definitions across navigation and dashboards:
    - `auditor`: Food Safety & Regulatory Authority focused on honey purity compliance, lab review inspections, batch recall enforcement, and apiary cluster health.
    - `admin`: System Administrator focused on stakeholder organization onboarding, user directory administration, IoT device fleets, and smart contract gas management.
  - Navigation (`frontend/src/config/navigation.ts`):
    - `auditor`: Dashboard, Audit & Recalls (`/authority/audits`), Apiary Clusters, Beekeepers, Hive Health, Quality Alerts, Blockchain Proofs.
    - `admin`: System Dashboard, Org Applications (`#requests`), User Directory, Device & Hives, Blockchain & Gas.
  - Dashboard Distinction (`frontend/src/app/(authority)/authority/dashboard/page.tsx`):
    - Admin views system infrastructure metrics (Active Hives, Healthy Colonies, Verified Batches, System Alerts) and organization registration queues.
    - Auditor views regulatory stats (Pending Audits, Quality Certified, Enforced Recalls, Anomaly Alerts) and a live preview queue of batches requiring regulatory review with direct links to the audit console.
- **Instant Refresh Feedback & Cache Invalidation (`frontend/src/lib/refresh.ts`)**:
  - Created `refreshWithFeedback` utility: invalidates the 60-second Axios client cache (`clearApiCache()`) and enforces a guaranteed minimum 500ms spinner duration.
  - Resolved issue where clicking "Refresh" with identical or cached data showed no visible re-render feedback.
  - Integrated across: Authority Dashboard, Authority Hives, Farmer Hives, Farmer Batches, Lab Dashboard, and Lab Quality Tests.

## [Phase 9: High-Frequency IoT Real-Time Monitoring & Twilio SMS Alerting] - 2026-09-11

### Added
- **Twilio SMS Notification Service (`backend/src/services/notification.service.ts`)**:
  - Direct Twilio SDK integration for real-time SMS dispatches on sensor failures or impossible physical readings.
  - Formatted alert template with `hiveId`, `deviceId`, detected metric/value, expected physical range, and IST timestamp (`DD MMM YYYY, HH:mm IST`).
  - In-memory SMS deduplication cooldown (`TWILIO_SMS_COOLDOWN_SECONDS`, default 1800s / 30m) preventing alert fatigue and notification storms on failing sensors.
  - Safe mock sender support for automated unit/integration test suites (zero live SMS or external network calls during testing).
- **High-Frequency Ingestion & Downsampled Persistence Architecture (`backend/src/controllers/iot.controller.ts`)**:
  - `POST /api/iot/telemetry` accepts high-frequency sensor streams arriving every 15–30 seconds (`TELEMETRY_EXPECTED_INTERVAL_SECONDS=15`).
  - Immediate strict validation on every incoming reading: checks `temperature` (-40°C to 70°C), `humidity` (0% to 100%), `weightKg` (0 to 300kg), rejecting `NaN`, `Infinity`, `null`, `undefined`, and non-numeric values.
  - **No Silent Clamping**: Out-of-bounds readings immediately trigger a critical `Alert` and Twilio SMS, returning `400 Bad Request`.
  - In-memory persistence throttling (`TELEMETRY_PERSIST_INTERVAL_SECONDS=600`): saves readings to MongoDB `SensorReading` collection only once every 10 minutes per device (`persisted: true`).
  - Intermediate high-frequency readings are processed in real time in memory, updating hive metadata/battery level and evaluating biological threshold alerts without unbounded DB growth (`persisted: false`).
- **Comprehensive High-Frequency IoT Test Suite (`backend/src/tests/highFrequencyTelemetry.test.ts`)**:
  - 13 comprehensive unit/integration test cases covering 15s/30s ingestion, 10-minute downsampling, physical bounds enforcement, SMS dispatch, cooldown deduplication, Twilio failure resilience, and history retrieval.

## [Phase 8: Complete HoneyChain Backend & Enterprise Capabilities] - 2026-09-11

### Added
- **Apiary & Hive Management Subsystem (`/api/apiaries`, `/api/hives`, `/hives`)**:
  - Full CRUD operations with multi-tenant organization scoping and RBAC (`beekeeper`, `admin`).
  - Automatic GeoJSON 2dsphere point coordinate generation and bounds validation (`latitude` [-90, 90], `longitude` [-180, 180]).
  - Hive registration with parent apiary reference, hardware device metadata, and initialized health summaries.
  - Express route alias `/hives` for complete frontend service compatibility.
- **Harvest Management Subsystem (`/api/harvests`, `/harvests`, `Harvest.ts`)**:
  - New Mongoose `Harvest` model tracking `harvestId`, `hiveId`, `apiaryId`, `beekeeperId`, `organizationId`, `quantityGrams`, and `floralOrigin`.
  - CRUD controller and routes (`POST`, `GET /`, `GET /:harvestId`) with tenant scoping and frontend alias `/harvests`.
- **Extended Batch Lifecycle & Provenance Operations (`/api/batches`)**:
  - `GET /api/batches`: Multi-tenant paginated batch retrieval with filters (`status`, `search`, `organizationId`).
  - `GET /api/batches/:batchId`: Detailed batch inspection with populated relations (`apiary`, `hives`, `organizationId`, `createdBy`).
  - `POST /api/batches/:batchId/certificate`: Laboratory assay report upload with `%PDF-` magic byte validation, SHA-256 hash generation, storage abstraction, and `quality.labReportHash` / `quality.labReportUrl` tracking.
  - `POST /api/batches/:batchId/deliver`: Physical and on-chain batch delivery handoff on Ethereum Sepolia, transitioning status to `Delivered` with recorded custody checkpoints.
- **Organization Onboarding & Smart Contract Wallet Synchronization**:
  - Automatic on-chain role granting (`grantRoleOnChain`) upon organization application approval.
  - Smart gas checking and test runner detection preventing testnet block mining stalls and zero-balance wallet failures.
- **Automated Threshold Alert Subsystem (`/api/alerts`, `Alert.ts`, `alert.service.ts`)**:
  - New `Alert` model with compound indexes for rapid query and deduplication.
  - 60-minute deduplication cooldown window preventing alert spam.
  - Automated triggers from IoT sensor metrics: hypothermia (<32°C), hyperthermia (>37.5°C), rapid weight drops (>1.5kg drop), and low battery (<15%).
  - Automated triggers from ML inference when high stress risk is detected.
- **IoT Diagnostics & Historical Telemetry (`/api/iot/telemetry/:hiveId`, `/api/iot/devices/:deviceId/status`)**:
  - Historical telemetry retrieval supporting `raw` and `hourly` resolution aggregations.
  - Device status endpoint reporting online/offline state, battery percentage, last ping, and current metrics.
- **Dashboard & Regional Cluster Analytics (`/api/analytics/dashboard`, `/api/analytics/clusters`)**:
  - Real-time MongoDB aggregation pipelines tailored by user role (Beekeeper, Lab, Processor, Distributor, Auditor, Admin).
  - Apiary geographic clustering grouping by region with calculated centroid coordinates (`avgLatitude`, `avgLongitude`), hive coverage, and farmer counts.
- **Storage Abstraction Service (`backend/src/services/storage.service.ts`)**:
  - PDF verification, SHA-256 digest computation, and dual-backend support (Cloudinary with local static fallback).
- **Comprehensive Integration Test Suites**:
  - `src/tests/apiaryHive.test.ts`: Apiary/Hive CRUD, GeoJSON, and tenant isolation tests.
  - `src/tests/batchExtended.test.ts`: Batch listing, filters, certificate upload, and delivery tests.
  - `src/tests/alertsAnalytics.test.ts`: Alert cooldown, harvest workflow, IoT telemetry history, and analytics aggregations.
  - All 149 test cases passing cleanly.

---

## [Phase 7: Hive Health & Disease Risk ML Inference Subsystem] - 2026-09-08

### Added
- **Internal Python Inference Microservice (`backend/ml/service.py`)**:
  - Exposes local HTTP endpoint on `127.0.0.1:5001` (`/health`, `/predict`).
  - Loads all 26 model artifacts once at startup into memory via `get_model()`, achieving ~81ms inference latency.
  - Supports CLI execution (`--predict-json`, `--health-check`) and automatic process management.
- **Model Package Integration (`backend/ml/model/`)**:
  - Bundled 26 external model artifacts unmodified: 6 scalers (`scaler_T1.pkl` to `scaler_T48.pkl`), 6 Isolation Forests (`iso_T1.pkl` to `iso_T48.pkl`), 5 XGBoost classifiers (`xgb_T6.pkl` to `xgb_T48.pkl`), 6 monthly quantile calibration files (`quantiles_T1.csv` to `quantiles_T48.csv`), `seasonal_baseline.csv`, `feature_config.json`, and `requirements.txt`.
- **Node.js ML Orchestration Service (`backend/src/services/ml.service.ts`)**:
  - **Local Time Conversion**: Automatically converts UTC timestamps to Indian Standard Time (IST, UTC+05:30) for accurate solar daylight (`is_daylight`) and seasonal baseline matching.
  - **Telemetry Contract Alignment**: Maps `ambientTemperature` and `ambientHumidity` with fallback to in-hive sensors; maps `weightKg`; aggregates signed bee flow (`flow = count_in - count_out`) hourly summed, never averaged.
  - **Insufficient Data Short-Circuiting**: Gracefully returns `INSUFFICIENT_DATA` when readings < 1 without invoking the Python process.
  - **Process Lifecycle Management**: Automatically checks and starts the internal Python service on Node startup and terminates it gracefully on `SIGINT`/`SIGTERM`.
- **REST API Endpoints (`backend/src/routes/ml.routes.ts`, `backend/src/controllers/ml.controller.ts`)**:
  - `POST /api/ml/predict/:hiveId`: Triggers real-time ML inference and persists to MongoDB.
  - `GET /api/ml/predictions/:hiveId`: Returns paginated historical predictions.
  - `GET /api/ml/latest/:hiveId`: Retrieves the most recent AI prediction for a hive.
  - `GET /api/ml/health`: Probes internal Python microservice health and loaded model tiers.
- **Data Layer Enhancements**:
  - `SensorReading.ts`: Added optional `flow`, `beeInCount`, and `beeOutCount` fields.
  - `AIPrediction.ts`: Expanded schema to store model tier (`T1`-`T48`), `stressRisk` (`LOW`, `MEDIUM`, `HIGH`), `stressProbability`, `abnormalityRisk`, `stressBasis`, `detectionScope`, `drivers`, `recommendation`, and `caveat`.
  - `Hive.ts`: Automatically updates `currentHealthSummary` (`healthScore`, `status`, `stressIndex`, `lastAIPredictionId`) upon inference.
- **Frontend Dashboard Integration**:
  - Added "Hive Health & AI Diagnostics" card to `frontend/index.html` and `backend/public/index.html`.
  - Displays real-time risk badges, composite health score (0-100), active inference tier, abnormality percentage, anomaly drivers, and action recommendations.
  - Added interactive "Run AI Analysis" button and hive selector in `frontend/app.js` and `backend/public/app.js`.
  - Added styling in `frontend/style.css` and `backend/public/style.css`.
- **Automated Testing Suite (`backend/src/tests/ml.test.ts`)**:
  - Added 13 new unit and integration tests covering local time conversion, signed flow calculation, ambient fallback, 404 handling, insufficient data, real model inference across tiers, and all REST endpoints.
  - Total test suite now passes 67/67 tests (100% pass rate).
- **Documentation**:
  - Created `docs/ml-integration.md` with complete architecture, contracts, tier definitions, troubleshooting, and deployment runbooks.
  - Updated `docs/architecture.md` (Section 9: Hive Health ML Subsystem).
  - Updated `docs/setup.md` (Render Build Command & local `setup:ml` script).

---

## [Phase 0: Project Foundation] - 2026-09-07

### Added
- **Repository Structure**:
  - Initialized top-level directories: `backend/`, `blockchain/`, `docs/`.
  - Initialized blockchain structure: `contracts/`, `scripts/`, `test/`, `deployments/amoy/`.
  - Added `.env.example` templates for both `backend` and `blockchain` subsystems.
- **Architectural Documentation**:
  - `docs/architecture.md`: Complete system architecture defining the IoT pipeline, MongoDB operational storage layer, AI service integration points, and Polygon Amoy provenance ledger.
  - `docs/decisions.md`: Documented ADR-001 ("Polygon Amoy replaces Hyperledger Fabric for prototype"), ADR-002 ("Strict separation of operational storage and provenance ledger"), and ADR-003 ("Event-driven history reconstruction").
  - `docs/setup.md`: Comprehensive setup and developer onboarding guide detailing prerequisites, secrets management, and Polygon Amoy testnet details.
  - `docs/changelog.md`: Phase-by-phase chronological tracking.
- **Root README & Security**:
  - Updated root `README.md` to clearly define project responsibilities, communication flow, and security guidelines.
  - Updated `.gitignore` to explicitly ignore Hardhat build artifacts (`artifacts/`, `cache/`, `typechain/`, `typechain-types/`) and sensitive environment files.

### Changed
- Formally abandoned Hyperledger Fabric in favor of Polygon Amoy testnet for consumer verifiability, lower infrastructure footprint, and standard EVM tooling.

---

## [Phase 1: Blockchain Data Model Design] - 2026-09-07

### Added
- **Contract Specification (`docs/contract.md`)**:
  - Defined on-chain vs. off-chain storage boundaries for honey batches (keeping raw IoT telemetry, AI models, and full lab PDFs strictly off-chain).
  - Designed `HoneyBatch` struct with EVM storage slot optimization (32-byte packing).
  - Specified safe integer numeric representations: `quantityGrams` (grams) and `moistureBasisPoints` (basis points / 0.01% resolution) to avoid floating-point errors.
  - Specified enums: `BatchStatus` and `QualityGrade`.
  - Detailed function signatures and state transitions for `registerBatch`, `certifyBatch`, `transferCustody`, `recallBatch`, and `getBatch`.
  - Specified events (`BatchRegistered`, `BatchCertified`, `CustodyTransferred`, `BatchRecalled`) for client-side timeline reconstruction via Polygon RPC.
  - Specified bidirectional interface and consumer verification payload between backend and blockchain.
- **Architectural Decisions (`docs/decisions.md`)**:
  - Added **ADR-004**: On-Chain Batch Data Model and Safe Numeric Representation Standards.
  - Added **ADR-005**: Role-Based Authorization & Custody Enforcement.

---

## [Phase 2: HoneyChainRegistry.sol Implementation & Test Suite] - 2026-09-07

### Added
- **Smart Contract (`blockchain/contracts/HoneyChainRegistry.sol`)**:
  - Implemented `HoneyChainRegistry` inheriting OpenZeppelin v5 `AccessControl`.
  - Defined role constants: `BEEKEEPER_ROLE`, `LABORATORY_ROLE`, `PROCESSOR_ROLE`, `DISTRIBUTOR_ROLE`, `AUDITOR_ROLE`.
  - Implemented write methods: `registerBatch`, `certifyBatch`, `transferCustody`, `recallBatch`.
  - Implemented read view methods: `getBatch`, `batchExists`.
  - Emitted all provenance lifecycle events: `BatchRegistered`, `BatchCertified`, `CustodyTransferred`, `BatchRecalled`.
  - Added gas-efficient custom errors for all business validation failures.
- **Hardhat Toolchain (`blockchain/`)**:
  - Configured Hardhat 2 development environment (`hardhat.config.cjs`) targeting Solidity `0.8.24` with optimizer enabled (200 runs).
  - Configured Polygon Amoy testnet network profile (`chainId: 80002`).
- **Comprehensive Test Suite (`blockchain/test/HoneyChainRegistry.test.cjs`)**:
  - 16 automated tests covering authorized & unauthorized registration, duplicate registration, laboratory certification, pre-registration checks, multi-actor custody transfers, invalid recipients, role-governed recall operations, post-recall access prevention, event argument emissions, and batch state integrity.
  - **Actual Test Output**: 16/16 tests passing on the local Hardhat network (960ms execution time).

---

## [Phase 3: Testnet Transition to Ethereum Sepolia & Deployment Preparation] - 2026-09-07

### Changed
- **Testnet Target Shift (Polygon Amoy → Ethereum Sepolia)**:
  - Transitioned the HoneyChain blockchain deployment target from Polygon Amoy to **Ethereum Sepolia** (Chain ID: `11155111`, Gas token: `Sepolia ETH`, Explorer: [Sepolia Etherscan](https://sepolia.etherscan.io/)) prior to executing any on-chain deployment.
  - Documented architectural rationale in **ADR-006** (official testnet recommendation, robust faucet availability, zero need for Polygon-specific L2 dependencies).
- **Configuration & Toolchain Updates**:
  - Updated `blockchain/hardhat.config.cjs` network definition to `sepolia` (Chain ID `11155111`) with Etherscan verification plugin.
  - Replaced `AMOY_RPC_URL` and `POLYGONSCAN_API_KEY` with `SEPOLIA_RPC_URL` and `ETHERSCAN_API_KEY` in `blockchain/.env.example` and `backend/.env.example`.
  - Replaced deployment scripts and commands: `deploy:sepolia` and `roles:sepolia`.
  - Updated deployment artifact target path to `blockchain/deployments/sepolia/HoneyChainRegistry.json`.
  - Replaced deployment and role assignment scripts (`deploy.cjs`, `assignRoles.cjs`) to target Sepolia Etherscan and Sepolia ETH.
- **Wallet Status**:
  - Maintained dedicated testnet deployer wallet: `0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08`.

### Added
- **Contract Deployment (`blockchain/deployments/sepolia/HoneyChainRegistry.json`)**:
  - Successfully deployed `HoneyChainRegistry.sol` to **Ethereum Sepolia** at address `0x65afF3B44441FfF68171a9a0AA28063BC83C208d`.
  - Transaction hash: `0x59d3d3f5cd1cc37984c17358ae0e071226cafd5b7c423739d5f2a3bf9243dde2` (Block: `11655688`, Gas used: `1,118,315`).
  - Saved deployment artifact containing ABI, address, chain ID, and receipt data.
- **On-Chain Stakeholder Role Assignments**:
  - Generated dedicated testnet keypairs for all five stakeholder roles in `blockchain/.env` with `chmod 600` permissions.
  - Granted and verified on-chain roles via `HoneyChainRegistry`:
    - `BEEKEEPER_ROLE`: `0x111748e2D54D3f151746Af8B508CE8AD626d7A93` (tx: `0xde96e9b83796d57746895479e7c4880d74fdc0f2a48fb5f4f0febfeff9c4fce9`)
    - `LABORATORY_ROLE`: `0x88bcE6325a09Fb4943d61A48eA5282EBeEb7744c` (tx: `0x96d8ac1517b6a3eb2da9cc9ee749677e30547b9b69f9a4d94d51c2f4a0007fa9`)
    - `PROCESSOR_ROLE`: `0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34` (tx: `0x27b494f4c1f8faf5f8798e99c6cd30151c16b13b4b66ea63aa4bb6bba3a3626c`)
    - `DISTRIBUTOR_ROLE`: `0x3003D5104621e8DD31c8c70DFFAa59816400D2D9` (tx: `0x51c6fb33e01dc0d6d870fe47c16eaf833ebc96c9edbb5ea720789b73af048a18`)
    - `AUDITOR_ROLE`: `0x09C1d432f79fB1Dad516bf688930aAB81aA0978a` (tx: `0xd7e162e7fbae0b240913b89524ac7b2eb735461993125c8aae8f2f8fe998a394`)
  - All roles verified on-chain as `true` via direct view calls to `hasRole(...)`.
- **Stakeholder Testnet Wallet Funding**:
  - Funded each stakeholder wallet with `0.003 Sepolia ETH` from deployer `0x0f196CED7e9fd60c64Fd7C1E03909b821EdacF08`:
    - Beekeeper: `0x6a2d5f274919d1b7701a2d8d223a1de230347a1ce71d086d053ae6fe35dbe563`
    - Laboratory: `0xc890ea91c6c8c4ac471d0757e5269e868c848fe3c5053b307580337f6e11870c`
    - Processor: `0x5b46bb02bc4bd2640295d2d7d74ffab3c4c7ada4345a4ca9b476163dfb9a057d`
    - Distributor: `0x0b35bfcb6b910ddfd2d4c2e6c3193608a0059940f5fc88d3f75bdb345aa0413b`
    - Auditor: `0x86c9afeb099868d8de4f949c9bb06d52ba72dcf929b889d56dfa92849ca707be`
  - Verified final balances: `0.003 ETH` per stakeholder; `0.03337 ETH` deployer reserve.

---

## [Phase 4: Blockchain & Backend Ethers.js Integration] - 2026-09-08

### Added
- **Blockchain Service (`backend/src/services/blockchain.service.ts`)**:
  - Bound ethers.js v6 to deployed contract `0x65afF3B44441FfF68171a9a0AA28063BC83C208d` on Sepolia.
  - Implemented role signers for Beekeeper, Laboratory, Processor, Distributor, and Auditor.
  - Implemented custom error decoder mapping Solidity custom reverts to friendly HTTP errors.
  - Implemented `getBatchHistory` querying indexed event filters (`BatchRegistered`, `BatchCertified`, `CustodyTransferred`, `BatchRecalled`).
  - Added deterministic SHA-256 canonical hashing utility.
- **REST API Endpoints & Controllers**:
  - `POST /api/batches`: Beekeeper harvest registration.
  - `POST /api/batches/:batchId/quality`: Lab quality certification.
  - `POST /api/batches/:batchId/transfer`: Supply chain custody transfer.
  - `POST /api/batches/:batchId/recall`: Batch recall by authorized roles.
  - `GET /api/verify/:batchId`: Consumer provenance verification with tamper detection.
- **Live Rehearsal Demo Script (`backend/src/scripts/demoRehearsal.ts`)**:
  - Verified live on-chain lifecycle from harvest to verification and recall across blocks `#11655868` to `#11655873`.
- **Merge & Sync**:
  - Fast-forward merged `blockchain` branch into `main` and pushed to remote `origin/main`.

---

## [Phase 5: Production MongoDB Data Layer & Seed Infrastructure] - 2026-09-08

### Added
- **Production MongoDB Connection (`backend/src/config/db.ts`)**:
  - Implemented connection pooling (`maxPoolSize: 50`, `minPoolSize: 10`, `socketTimeoutMS: 45000`).
  - Implemented credential masking (`sanitizeMongoUri`) in connection logs.
  - Registered process event handlers for graceful shutdown (`SIGINT`, `SIGTERM`).
- **Apiary Model (`backend/src/models/Apiary.ts`)**:
  - Represents physical apiary sanctuaries with GeoJSON Point coordinates (`2dsphere` index).
  - Tracks beekeeper owner, contact information, flora types, capacity, and active hives.
- **Hive Model (`backend/src/models/Hive.ts`)**:
  - Represents individual hives with queen details, hardware device metadata (ESP32/LoRa), and active health summary.
  - References parent Apiary via ObjectId and indexed `apiaryId`.
- **SensorReading Model (`backend/src/models/SensorReading.ts`)**:
  - High-volume time-series telemetry model for temperature, humidity, weight, sound frequency, and acoustics.
  - Optimized with compound B-tree indexes: `{ hiveId: 1, timestamp: -1 }`, `{ deviceId: 1, timestamp: -1 }`, `{ timestamp: -1 }`.
- **AIPrediction Model (`backend/src/models/AIPrediction.ts`)**:
  - Stores AI model outputs for colony health, disease risk, swarming predictions, and yield estimates.
  - Supports input window summaries, confidence scores, and action recommendations.
- **Batch Model Preservation & Extension (`backend/src/models/Batch.ts`)**:
  - Fully preserved existing blockchain and provenance fields.
  - Extended with optional `apiary` and `hives` relationships.
- **Repeatable Seed Script (`backend/src/scripts/seed.ts`)**:
  - Idempotent script populating 3 apiaries, 6 hives, 100 hourly IoT telemetry readings, 3 AI predictions, and 2 honey batches.
  - Added npm script: `npm run seed`.
- **Model Test Suite (`backend/src/tests/models.test.ts`)**:
  - 14 automated tests validating schema constraints, coordinates, unique indexes, relationships, and time-series queries.
  - Total backend tests passing: **29/29 tests**.

---

## [Phase 6: IoT Telemetry Ingestion & Integrated Simulator Service] - 2026-09-08

### Added
- **Telemetry Ingestion API (`backend/src/routes/iot.routes.ts`, `backend/src/controllers/iot.controller.ts`)**:
  - Implemented `POST /api/iot/telemetry` for high-throughput ingestion from edge hardware and simulators.
  - Implemented strict validation and sanity bounds: temperature (-40°C to +70°C), humidity (0-100%), weight (0-300kg), acoustics (0-140dB), sound frequency (0-5000Hz), battery level (0-100%).
  - Enforced timestamp sanity against clock drift (max 10 minutes into the future).
  - Enforced hive status verification, rejecting readings for inactive or collapsed hives.
  - Added automatic hive summary updates (`latestReadingAt`, `lastPingAt`, `batteryLevelPct`).
- **Idempotency & Deduplication (`backend/src/models/SensorReading.ts`)**:
  - Added unique compound index `{ deviceId: 1, timestamp: 1 }` preventing duplicate insertions on network retries.
  - Controller intercepts E11000 duplicate key errors and returns `HTTP 200 OK` with `{ duplicate: true }`.
- **System Health Endpoint (`backend/src/app.ts`)**:
  - Implemented `GET /health` returning server status, uptime in seconds, timestamp, and database connectivity state.
  - Zero sensitive database URIs or credentials leaked.
- **Single-Server Integrated Simulator (`backend/src/scripts/simulateIoT.ts`, `backend/src/server.ts`)**:
  - Integrated directly into the Express backend server (`server.ts`).
  - Single server model: the backend process itself boots up and hits its own deployed ingestion URL (`IOT_TARGET_URL/api/iot/telemetry`) on a recurring background schedule.
  - Stays cleanly idle if `IOT_TARGET_URL` is empty in development, and activates immediately when configured in production (e.g. Render).
  - Simulates 5 seeded physical hives with realistic circadian environmental drift, diurnal temperature cycles, nectar weight accumulation, and battery discharge.
  - Dynamic target URL resolution via `IOT_TARGET_URL` and configurable cycle interval via `IOT_INTERVAL_MS` (defaults to 10 minutes / 600000ms).
  - Ingestion metadata tagging `{ source: "simulator", simulationVersion: "1.0" }`.
  - Resilience against server downtime, network drops, and HTTP timeouts without crashing.
  - Can also be optionally run via CLI with `npm run simulate:iot`.
- **Integrated Frontend Serving (`frontend/`, `backend/src/app.ts`)**:
  - Implemented sleek, responsive browser interface in `frontend/` (`index.html`, `style.css`, `app.js`) and mirrored in `backend/public/`.
  - Express serves `index.html` on `GET /` when requested by a web browser, with content negotiation falling back to JSON for API consumers.
  - Interactive on-chain batch provenance verification panel with direct links to Sepolia Etherscan, certified quality assay display, and tamper-proof verification badges.
  - Live system health badge polling `/health` with connection status and uptime counter.
  - Monitored hives grid showcasing all 5 IoT edge gateways and apiaries.
  - Zero sensitive keys, passwords, or secrets leaked to frontend code or bundle.
- **Automated Test Suite (`backend/src/tests/iot.test.ts`)**:
  - 15 comprehensive automated tests covering `GET /` HTML serving, JSON negotiation, `GET /health`, valid ingestion, missing fields, out-of-bounds metrics, timestamp drift, inactive hives, deduplication idempotency, target URL resolution, interval resolution, device state evolution, network resilience, and background simulator lifecycle.
  - Total backend tests passing: **44/44 tests**.

---

## [1.3.0] - 2026-09-08: Consumer QR Verification System

### Added
- **Public Base URL Configuration (`backend/src/config/env.ts`, `backend/.env.example`)**:
  - Added `PUBLIC_BASE_URL` environment variable for constructing verifiable jar URLs.
  - Normalized stripping of trailing slashes.
  - Clear, descriptive error if `PUBLIC_BASE_URL` is missing when generating QR codes.
- **QR Code Generation Service (`backend/src/services/qr.service.ts`)**:
  - Reusable QR service powered by `qrcode`.
  - Supports high error-correction level (`H`) allowing up to 30% packaging damage without loss of scannability.
  - Generates PNG Data URLs (`data:image/png;base64,...`) and lossless SVG vector markup.
- **Batch QR REST API (`backend/src/controllers/batch.controller.ts`, `backend/src/routes/batch.routes.ts`)**:
  - `GET /api/batches/:batchId/qr`: Public, unauthenticated endpoint returning verification URL, PNG data URI, and SVG markup.
  - Returns HTTP 404 for nonexistent batches and HTTP 400 for empty batch IDs.
- **Dedicated Consumer Verification Route (`backend/src/app.ts`)**:
  - `GET /verify/:batchId` and `GET /verify` served by Express before fallback handlers.
  - Supports direct browser navigation from mobile QR scanners.
- **Mobile-First Consumer Verification Web Page (`frontend/verify.html`, `frontend/verify.js`, `frontend/style.css`)**:
  - Instant on-load verification querying `GET /api/verify/:batchId`.
  - Authenticity status badges:
    - 🟢 `✓ AUTHENTIC HONEY` (Anchored on Ethereum Sepolia, 100% hash match)
    - 🔴 `INTEGRITY WARNING` (Hash mismatch / data tampering detected)
    - ⛔ `PRODUCT RECALLED` (Prominent recall warning banner with reason, auditor address, and tx link)
    - ⚠️ `PRODUCT NOT FOUND` (Informative 404 state for unlisted batches)
  - Rich honey details: Floral origin, harvest date, batch volume, certified lab grade, moisture %, and apiary GPS coordinates.
  - Cryptographic audit trail: On-chain vs off-chain SHA-256 hash comparison.
  - Chronological provenance timeline with direct links to Sepolia Etherscan transactions.
  - One-click actions: "Print Proof" (optimized `@media print` certificate) and "Share Proof".
- **Main Portal QR Preview & Jar Label Printing (`frontend/index.html`, `frontend/app.js`)**:
  - Added "View / Print QR Code" button and modal dialog.
  - Printable honey jar label popup and PNG download.
  - Mirrored all frontend assets to `backend/public/` for reliable containerized serving.
- **Automated Test Suite (`backend/src/tests/qr.test.ts`)**:
  - 9 automated unit and integration tests covering QR URL formatting, error handling for missing variables, PNG/SVG format generation, `GET /api/batches/:batchId/qr`, 404 handling, and consumer web page routing.
  - Total backend tests passing: **54/54 tests**.









