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
