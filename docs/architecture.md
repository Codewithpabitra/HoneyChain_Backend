# HoneyChain System Architecture

## 1. Overview

**HoneyChain** is a comprehensive IoT, AI, and Blockchain-enabled platform developed for the **Smart India Hackathon 2026**. The system provides end-to-end monitoring of honeybee hives and immutable traceability of honey from apiary harvest to consumer consumption.

The system addresses two fundamental challenges in modern apiculture:
1. **Apiary & Colony Health Monitoring**: Detecting colony collapse, stress, disease risk, and yield conditions through continuous environmental and acoustic telemetry.
2. **Honey Provenance & Anti-Adulteration**: Providing tamper-resistant proof of origin, quality certification, and custody transfers via Ethereum Sepolia blockchain, accessible to consumers through dynamic QR verification.

---

## 2. High-Level Architecture Flow

```text
[Apiary / Hive Layer]
  Hive Sensors (Temp, Humidity, Weight, Acoustic/Vibration)
       │
       ▼
  ESP32 Microcontroller Nodes
       │ (LoRa / RF)
       ▼
  Apiary Gateway (ESP32 / Raspberry Pi)
       │ (Cellular / Wi-Fi Internet)
       ▼
[Ingestion & Intersystem Layer]
  MQTT Broker (Topic: apiaries/{apiaryId}/hives/{hiveId}/telemetry)
       │
       ▼
  Node.js / Express Backend
       ├── MongoDB (Operational Storage: hives, telemetry, batches, lab reports)
       ├── AI Inference Service (Colony health score, stress alerts, yield forecasting)
       └── Blockchain Client (ethers.js v6)
                │ (JSON-RPC over HTTPS)
                ▼
[Decentralized Provenance Layer]
  Ethereum Sepolia Testnet (Chain ID: 11155111)
       ├── HoneyChainRegistry.sol (Smart Contract)
       │      ├── Events: BatchRegistered, BatchCertified, CustodyTransferred, BatchRecalled
       │      └── State: Batch hashes, quality grade, custodian address, status
       └── Sepolia Etherscan (Public block explorer verification)
                │
                ▼
[Consumer & Stakeholder Verification]
  React Web / Mobile App ◄─── QR Code Scan on Honey Jar
```

---

## 3. Storage Boundary: On-Chain vs. Off-Chain

A foundational architectural rule in HoneyChain is the strict division between **operational data** and **provenance proofs**:

| Data Type | Target Storage | Rationale |
|---|---|---|
| High-frequency sensor readings (temperature, humidity, weight) | **MongoDB** | High volume, high frequency; storing raw telemetry on-chain would cause prohibitive gas costs and network congestion. |
| Hive profiles, beekeeper user accounts, credentials | **MongoDB** | Private, operational data requiring CRUD semantics, indexing, and authentication. |
| AI analysis results, health trends, telemetry alerts | **MongoDB** | Predictive models update frequently; intermediate metrics are operational. |
| Laboratory analysis reports (PDFs, detailed chemical assays) | **Off-Chain / Object Storage** | Binary files are too large for EVM storage. |
| **Harvest Batch Cryptographic Hash** (SHA-256 of batch metadata) | **Ethereum Sepolia** | Tamper-evident commitment linking physical harvest to digital record. |
| **Lab Report Hash** (SHA-256 / IPFS CID of certified analysis) | **Ethereum Sepolia** | Ensures lab test certificate cannot be altered or swapped post-issuance. |
| **Custody Transitions** (Signatures, timestamps, custodian addresses) | **Ethereum Sepolia** | Non-repudiable audit trail of batch movement across supply chain actors. |
| **Quality Grade & Batch Status** (Grade A/B/C, Created, Certified, Recalled) | **Ethereum Sepolia** | Critical state required for consumer verification and recall enforcement. |

---

## 4. Blockchain Role-Based Authorization

The on-chain smart contract (`HoneyChainRegistry.sol`) enforces strict role-based access control (RBAC). Transactions must be signed by registered, authorized wallet addresses:

- **`ADMIN`**: Governs contract lifecycle and registers authorized role wallets.
- **`BEEKEEPER`**: Can invoke `registerBatch(...)` to record a new honey batch harvested from an apiary.
- **`LABORATORY`**: Can invoke `certifyBatch(...)` to attach quality grades and lab report hashes.
- **`PROCESSOR`**: Can accept custody, record processing parameters, and forward custody.
- **`DISTRIBUTOR`**: Can record logistics checkpoints and retail handoff.
- **`AUDITOR`**: Read-only verification and compliance oversight; can inspect historical proofs.

> **Key Rule**: Private keys for server-side role operations are maintained in isolated environment variables on the backend and are **never** shared with clients, logged to console, or committed to source control.

---

## 5. Event-Driven Provenance History

Rather than storing dynamic historical arrays inside Solidity contract storage—which drastically increases gas costs—the contract emits structured, indexed EVM events:
- `BatchRegistered(bytes32 indexed batchId, address indexed beekeeper, bytes32 metadataHash, uint256 timestamp)`
- `BatchCertified(bytes32 indexed batchId, address indexed laboratory, bytes32 labReportHash, uint8 qualityGrade, uint256 timestamp)`
- `CustodyTransferred(bytes32 indexed batchId, address indexed from, address indexed to, string location, uint256 timestamp)`
- `BatchRecalled(bytes32 indexed batchId, address indexed by, string reason, uint256 timestamp)`

The backend client (or any independent consumer portal) reconstructs the chronological journey of a honey jar by querying past event logs matching `batchId` directly from the Sepolia RPC provider.

---

## 6. MongoDB Operational Data Architecture

### 6.1 Entity Relationship Model (ERD)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                                Apiary                                  │
│  - apiaryId (String, Unique)                                           │
│  - name (String)                                                       │
│  - beekeeper (String, EVM Address)                                     │
│  - location: { lat, lng, region, address, coordinates [2dsphere] }     │
│  - floraType: [String]                                                 │
│  - capacity: Number                                                    │
│  - hives: [ObjectId -> Hive]                                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1:N
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                                 Hive                                   │
│  - hiveId (String, Unique)                                             │
│  - apiary (ObjectId -> Apiary)                                         │
│  - apiaryId (String, Fast Index)                                       │
│  - beekeeper (String, EVM Address)                                     │
│  - hiveType (Langstroth | Top-Bar | Smart-IoT-Box)                     │
│  - beeSpecies (String, e.g. Apis cerana indica)                        │
│  - queenInfo: { queenId, markedColor, isMated, installedDate }         │
│  - deviceMetadata: { deviceId, hardwareModel, firmware, battery }      │
│  - currentHealthSummary: { healthScore, status, stressIndex, alerts }  │
└─────────────┬────────────────────────────────────────────┬─────────────┘
              │ 1:N (Time-Series Telemetry)                 │ 1:N
              ▼                                            ▼
┌──────────────────────────────────────────┐ ┌───────────────────────────┐
│              SensorReading               │ │       AIPrediction        │
│  - hiveId (String, Index)                │ │  - predictionId (Unique)  │
│  - hive (ObjectId -> Hive)               │ │  - targetType: hive|batch │
│  - deviceId (String, Index)              │ │  - hive (ObjectId -> Hive)│
│  - timestamp (Date, Index)               │ │  - batch (ObjectId->Batch)│
│  - temperature (Number, C)               │ │  - predictionType:        │
│  - humidity (Number, % RH)               │ │    colony_health |        │
│  - weightKg (Number, kg)                 │ │    swarming_risk |        │
│  - soundFrequencyHz (Number, Hz)         │ │    productivity_yield     │
│  - acousticsDb (Number, dB)              │ │  - confidence (0.0 - 1.0) │
│  - batteryLevelPct (Number, %)           │ │  - modelVersion (String)  │
│  - ambientTemperature / ambientHumidity  │ │  - inputWindow (Summary)  │
│  - metadata (LoRa/Packet telemetry)      │ │  - result (Anomalies,     │
└──────────────────────────────────────────┘ │    actions, stressScore)  │
                                             └───────────────────────────┘
                                                           ▲
                                                           │ Optional Ref
┌──────────────────────────────────────────────────────────┴─────────────┐
│                             Honey Batch                                │
│  - batchId (String, Unique)                                            │
│  - batchIdBytes32 (String, Contract Key)                               │
│  - producer (String, Beekeeper EVM Address)                            │
│  - currentCustodian (String, Active Custodian Address)                 │
│  - quantityGrams (Number)                                              │
│  - harvestTimestamp (Number)                                           │
│  - floralOrigin (String)                                               │
│  - sourceHives: [String]                                               │
│  - apiary (ObjectId -> Apiary)                                         │
│  - hives: [ObjectId -> Hive]                                           │
│  - apiaryLocation: { lat, lng, region, elevationMeters }               │
│  - metadata (Canonical JSON Object)                                    │
│  - metadataHash (0x SHA-256 Digest) ◄────────── Anchored on Sepolia    │
│  - status (Registered | Certified | InTransit | Delivered | Recalled)  │
│  - quality: { grade, moisturePercentage, labReportHash, certifiedBy }  │
│  - custodyHistory: [{ from, to, location, timestamp, txHash }]         │
│  - recall: { recalled, reason, recalledBy, txHash }                    │
│  - blockchain: { network, chainId, contractAddress, registrationTx }   │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 High-Scale IoT Telemetry Indexing Strategy
Sensor readings from thousands of ESP32 edge gateways stream in via MQTT. To prevent collection table scans and optimize dashboard retrieval:
1. **Compound Index `{ hiveId: 1, timestamp: -1 }`**:
   - `db.sensorreadings.find({ hiveId: "HIVE-01" }).sort({ timestamp: -1 }).limit(1)`: Returns the hive's latest live reading in single-digit milliseconds via index lookup without reading full collections.
   - `db.sensorreadings.find({ hiveId: "HIVE-01", timestamp: { $gte: start, $lte: end } })`: Bounds time-range scans directly within the hive's index slice.
2. **Compound Index `{ deviceId: 1, timestamp: -1 }`**: Powers edge gateway hardware diagnostics, battery health monitoring, and connection dropout detection.
3. **Compound Index `{ timestamp: -1 }`**: Global chronological ordering for pipeline workers and batch export jobs.

### 6.3 Standard Collections vs. MongoDB Time-Series Collections
HoneyChain implements regular Mongoose collections paired with compound B-tree index slices rather than native MongoDB 5.0 time-series collections.
- **Rationale**:
  1. Maximum compatibility across standalone nodes, replica sets, memory-testing servers, and multi-cloud tiers.
  2. Full support for document-level updates, upserts, secondary compound indexes, and polymorphic metadata fields without MongoDB engine restrictions.
  3. Consistent performance with zero query engine translation overhead.

---

## 7. IoT Telemetry Ingestion & Edge Simulation Architecture

### 7.1 Telemetry Ingestion Pipeline (`POST /api/iot/telemetry`)
Edge hardware (ESP32 nodes/gateways) or the standalone edge simulator transmit sensor readings via HTTP POST to the backend API:

```text
┌───────────────────────────────┐
│     ESP32 Node / Gateway      │
│  OR Standalone Edge Simulator │
└───────────────┬───────────────┘
                │ HTTP POST /api/iot/telemetry
                │ Payload: { deviceId, hiveId, timestamp, metrics: {...}, metadata: {...} }
                ▼
┌───────────────────────────────┐
│       Express API Server      │
│   - Schema & Bounds Checking  │
│   - Hive Status Verification  │
│   - Idempotent Deduplication  │
└───────────────┬───────────────┘
                ├── Updates Hive (lastPingAt, latestReadingAt, batteryLevelPct)
                └── Writes SensorReading Document (Indexed by { hiveId, timestamp }, { deviceId, timestamp })
                ▼
┌───────────────────────────────┐
│       MongoDB Database        │
└───────────────────────────────┘
```

### 7.2 Strict Input Validation & Sanity Bounds
To maintain data integrity and protect the AI engine from sensor noise or compromised edge devices, incoming telemetry is validated against realistic physical bounds:
- **Temperature**: `-40°C` to `+70°C` (disallowing impossible cryogenic or combustion values)
- **Humidity**: `0%` to `100% RH`
- **Weight**: `0 kg` to `300 kg` (accommodating empty supers up to heavy harvest-ready hives)
- **Sound Frequency**: `0 Hz` to `5000 Hz`
- **Acoustic Amplitude**: `0 dB` to `140 dB`
- **Battery**: `0%` to `100%`
- **Timestamp**: Valid ISO 8601 string, bounded by a 10-minute maximum future clock-drift window.
- **Hive Verification**: Active verification against the `hives` collection; readings for unknown, archived, or collapsed hives are rejected with HTTP 404/422.

### 7.3 Idempotency & Deduplication
Network drops and LoRa retransmissions often cause duplicate packets. The database layer enforces uniqueness via the compound index:
```javascript
{ deviceId: 1, timestamp: 1 } // unique: true
```
If an edge gateway retransmits an identical reading, the API responds with `HTTP 200 OK` and `{ success: true, duplicate: true }`, ensuring gateway operations proceed without error while preserving database hygiene.

### 7.4 Edge Simulator to Physical Hardware Transition
Prior to physical ESP32 and LoRa node deployment, the HoneyChain IoT layer is powered by a standalone stateful simulator (`backend/src/scripts/simulateIoT.ts`):
1. **Identical Protocol**: The simulator communicates strictly through the external HTTP ingestion endpoint (`POST /api/iot/telemetry`), exactly mimicking physical ESP32 gateway firmware.
2. **Environment-Driven Target**: The simulator consumes `IOT_TARGET_URL` from its environment, ensuring complete decoupling from backend code.
3. **Drop-In Hardware Replacement**: When physical ESP32/LoRa hardware is powered on and provisioned with the backend URL, the simulator can simply be halted. No backend code modifications or database migrations are required.


