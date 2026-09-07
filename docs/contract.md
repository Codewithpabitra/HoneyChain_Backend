# HoneyChain Blockchain Specification (HoneyChainRegistry.sol)

## 1. Overview & Architectural Role

The **HoneyChainRegistry** smart contract provides the decentralized, immutable provenance layer for the HoneyChain platform. Deployed on **Ethereum Sepolia Testnet** (Chain ID: `11155111`), it anchors physical honey harvests, quality lab certifications, and custody transitions without storing high-volume operational data.

---

## 2. On-Chain vs. Off-Chain Data Boundary

| Field / Asset | Storage Location | Representation | Rationale |
|---|---|---|---|
| **Batch Identifier (`batchId`)** | On-Chain & Off-Chain | `bytes32` | Unique index linking MongoDB batch document with the on-chain registry. |
| **Beekeeper / Producer** | On-Chain & Off-Chain | `address` | Cryptographic identity of honey producer; verifies origin. |
| **Harvest Timestamp** | On-Chain & Off-Chain | `uint64` (Unix epoch seconds) | Tamper-proof record of when honey was harvested. |
| **Harvest Quantity** | On-Chain & Off-Chain | `uint64` (Grams) | Discrete integer representation in grams (e.g. 24.5 kg = `24500` g). Avoids float errors. |
| **Harvest Metadata Digest** | On-Chain | `bytes32` (SHA-256 hash) | Cryptographic digest of canonical JSON containing source hive IDs, GPS coordinates, floral variety, and weather snapshot. |
| **Full Harvest Metadata JSON** | Off-Chain (MongoDB) | Structured Document | Contains hive lists, beekeeper profile, GPS coordinates, apiary photos. |
| **Raw IoT Sensor Telemetry** | Off-Chain (MongoDB) | Time-Series Documents | Temperature, humidity, weight, acoustics (thousands of entries per day; prohibitive on-chain). |
| **AI Colony Health / Stress Scores**| Off-Chain (MongoDB) | Numeric / JSON | Operational model outputs, continuously updating. |
| **Lab Report Digest** | On-Chain | `bytes32` (SHA-256 / IPFS hash) | Cryptographic hash of official lab certificate. Guarantees certificate cannot be modified or replaced. |
| **Full Lab Certificate** | Off-Chain (Object Store) | PDF / Assay JSON | Full chemical spectrometry, pollen microscopy, enzyme assays, antibiotics screening. |
| **Lab Quality Grade** | On-Chain & Off-Chain | `uint8` (Enum) | Certified quality category (`GRADE_A`, `GRADE_B`, `GRADE_C`, `SUBSTANDARD`). |
| **Moisture Content** | On-Chain & Off-Chain | `uint16` (Basis Points) | Scaled integer with 2 decimal places (`18.25%` = `1825` bps). Zero float errors. |
| **Current Custodian** | On-Chain & Off-Chain | `address` | Active custodian responsible for physical batch. |
| **Batch Lifecycle Status** | On-Chain & Off-Chain | `uint8` (Enum) | Lifecycle state machine flag (`Registered`, `Certified`, `InTransit`, `Delivered`, `Recalled`). |
| **Custody Transfer Details** | Event Logs (On-Chain) | Indexed EVM Events | Location string, sender, recipient, timestamp emitted via events; historical chain queried via RPC. |

---

## 3. Role-Based Access Control (RBAC)

The contract implements role-based authorization using byte identifier constants (`bytes32`):

| Role Identifier | Intended Stakeholder | Permitted Blockchain Actions |
|---|---|---|
| **`DEFAULT_ADMIN_ROLE` / `ADMIN_ROLE`** | System Administrator / Co-op Lead | - Grant & revoke roles<br>- Emergency `recallBatch` across any batch |
| **`BEEKEEPER_ROLE`** | Registered Beekeeper Wallets | - `registerBatch`: Register new harvest batch<br>- `transferCustody`: Transfer custody to processor<br>- `recallBatch`: Recall their own batch if contaminated |
| **`LABORATORY_ROLE`** | Accredited Testing Laboratories | - `certifyBatch`: Record lab test hash, moisture, and quality grade<br>- `recallBatch`: Flag/recall batch failing critical adulteration tests |
| **`PROCESSOR_ROLE`** | Honey Processing & Bottling Facilities | - `transferCustody`: Transfer processed/bottled batches to distributor |
| **`DISTRIBUTOR_ROLE`** | Logistics Providers & Retail Distributors | - `transferCustody`: Log logistics transfer or delivery to retail |
| **`AUDITOR_ROLE`** | Regulators (FSSAI, AGMARK) & Co-op Auditors | - Read-only inspection role; can query state and events across all batches |

---

## 4. Contract State & Data Structures

### 4.1 Enums

```solidity
enum BatchStatus {
    Registered,   // 0: Batch registered by beekeeper
    Certified,    // 1: Tested and certified by accredited laboratory
    InTransit,    // 2: Custody handed over for transportation/processing
    Delivered,    // 3: Reached final retail or distribution point
    Recalled      // 4: Permanently flagged/recalled due to quality/safety defect
}

enum QualityGrade {
    None,         // 0: Uncertified
    GradeA,       // 1: Premium purity (Moisture < 18.00%, Hydroxymethylfurfural within limits)
    GradeB,       // 2: Standard commercial table grade (Moisture <= 20.00%)
    GradeC,       // 3: Industrial/baking grade
    Substandard   // 4: Failed purity or adulteration tests
}
```

### 4.2 Batch Struct

To minimize gas costs, storage variables are packed tightly into 32-byte slots:

```solidity
struct HoneyBatch {
    // Slot 1: 32 bytes
    bytes32 metadataHash;            // SHA-256 hash of harvest metadata JSON in MongoDB

    // Slot 2: 32 bytes
    bytes32 labReportHash;           // SHA-256 / IPFS hash of lab certificate

    // Slot 3: 20 + 8 + 4 = 32 bytes
    address producer;                // Beekeeper wallet that harvested the batch
    uint64 harvestTimestamp;         // Unix timestamp of harvest
    uint32 _reserved1;               // Reserved for future extensions

    // Slot 4: 20 + 8 + 4 = 32 bytes
    address certifier;               // Laboratory wallet that certified the batch
    uint64 certificationTimestamp;   // Unix timestamp when certified
    uint32 _reserved2;

    // Slot 5: 20 + 8 + 2 + 1 + 1 = 32 bytes
    address currentCustodian;        // Current wallet holding custody
    uint64 quantityGrams;            // Quantity in grams (e.g. 25,000 g = 25.000 kg)
    uint16 moistureBasisPoints;      // Moisture % in basis points (1825 = 18.25%)
    BatchStatus status;              // Lifecycle status enum (uint8)
    QualityGrade qualityGrade;       // Quality grade enum (uint8)
}
```

### 4.3 Field Mutability Matrix

| Field | Mutability | Modifying Action | Authorized Role |
|---|---|---|---|
| `metadataHash` | **Immutable** | `registerBatch` | `BEEKEEPER_ROLE` |
| `producer` | **Immutable** | `registerBatch` | `BEEKEEPER_ROLE` |
| `harvestTimestamp` | **Immutable** | `registerBatch` | `BEEKEEPER_ROLE` |
| `quantityGrams` | **Immutable** | `registerBatch` | `BEEKEEPER_ROLE` |
| `labReportHash` | Mutable (Once) | `certifyBatch` | `LABORATORY_ROLE` |
| `certifier` | Mutable (Once) | `certifyBatch` | `LABORATORY_ROLE` |
| `certificationTimestamp` | Mutable (Once) | `certifyBatch` | `LABORATORY_ROLE` |
| `qualityGrade` | Mutable (Once) | `certifyBatch` | `LABORATORY_ROLE` |
| `moistureBasisPoints` | Mutable (Once) | `certifyBatch` | `LABORATORY_ROLE` |
| `currentCustodian` | Mutable | `transferCustody` | Current Custodian (`BEEKEEPER`, `PROCESSOR`, `DISTRIBUTOR`) |
| `status` | Mutable | `certifyBatch`, `transferCustody`, `recallBatch` | Role-governed by transition rules |

---

## 5. State Machine & Transitions

```text
       [ registerBatch ]
              │
              ▼
         REGISTERED (0)
              │
              ▼
       [ certifyBatch ]
              │
              ▼
          CERTIFIED (1) ───────────┐
              │                    │
              ▼                    │
     [ transferCustody ]           │
              │                    │
              ▼                    │ [ recallBatch ]
         IN_TRANSIT (2)            │
          │         ▲              │
          │         │              │
[ transferCustody ] │              │
          ▼         │              │
         DELIVERED (3)             ▼
              │               RECALLED (4)
              ▼               [Terminal State]
        [ recallBatch ]
```

### State Rules:
1. **Registered**: Batch exists. Can be certified or directly recalled.
2. **Certified**: Lab report attached. Custody can now be transferred to Processor or Distributor.
3. **InTransit**: Custody transferred between supply chain participants. Can be transferred multiple times or marked Delivered.
4. **Delivered**: Reached final destination.
5. **Recalled**: Irreversible terminal state. Once recalled, no further custody transfers or certifications are accepted.

---

## 6. Events Specification

No historical query function (`getBatchHistory`) exists in Solidity. State changes emit indexed events, enabling the backend `ethers.js` client to query event logs via Polygon RPC filters.

```solidity
event BatchRegistered(
    bytes32 indexed batchId,
    address indexed beekeeper,
    uint64 quantityGrams,
    bytes32 metadataHash,
    uint64 harvestTimestamp
);

event BatchCertified(
    bytes32 indexed batchId,
    address indexed laboratory,
    bytes32 labReportHash,
    QualityGrade qualityGrade,
    uint16 moistureBasisPoints,
    uint64 certificationTimestamp
);

event CustodyTransferred(
    bytes32 indexed batchId,
    address indexed from,
    address indexed to,
    string location,
    uint64 timestamp
);

event BatchRecalled(
    bytes32 indexed batchId,
    address indexed by,
    string reason,
    uint64 timestamp
);
```

---

## 7. Smart Contract Functions & Signatures

### 7.1 Write Functions

#### `registerBatch`
Registers a newly harvested batch.
```solidity
function registerBatch(
    bytes32 batchId,
    uint64 quantityGrams,
    bytes32 metadataHash,
    uint64 harvestTimestamp
) external returns (bool);
```
- **Preconditions**:
  - Caller must have `BEEKEEPER_ROLE`.
  - `batchId` must not already exist (`batches[batchId].producer == address(0)`).
  - `quantityGrams > 0`.
  - `metadataHash != bytes32(0)`.
- **Postconditions**:
  - Sets `producer = msg.sender`, `currentCustodian = msg.sender`.
  - Sets `status = BatchStatus.Registered`.
  - Emits `BatchRegistered`.

#### `certifyBatch`
Attaches laboratory analysis results.
```solidity
function certifyBatch(
    bytes32 batchId,
    bytes32 labReportHash,
    QualityGrade qualityGrade,
    uint16 moistureBasisPoints
) external returns (bool);
```
- **Preconditions**:
  - Caller must have `LABORATORY_ROLE`.
  - Batch must exist and not be in `Recalled` state.
  - `labReportHash != bytes32(0)`.
  - `qualityGrade != QualityGrade.None`.
- **Postconditions**:
  - Sets `certifier = msg.sender`, `labReportHash`, `qualityGrade`, `moistureBasisPoints`, `certificationTimestamp = uint64(block.timestamp)`.
  - Updates `status = BatchStatus.Certified`.
  - Emits `BatchCertified`.

#### `transferCustody`
Hands over custody of the physical batch to another verified participant.
```solidity
function transferCustody(
    bytes32 batchId,
    address to,
    string calldata location
) external returns (bool);
```
- **Preconditions**:
  - Caller must be `currentCustodian`.
  - `to != address(0)` and `to != msg.sender`.
  - Recipient `to` must hold an authorized role (`PROCESSOR_ROLE`, `DISTRIBUTOR_ROLE`, or `BEEKEEPER_ROLE`).
  - Batch must not be in `Recalled` state.
- **Postconditions**:
  - Updates `currentCustodian = to`.
  - Sets `status = BatchStatus.InTransit`.
  - Emits `CustodyTransferred`.

#### `recallBatch`
Flags a defective or contaminated batch.
```solidity
function recallBatch(
    bytes32 batchId,
    string calldata reason
) external returns (bool);
```
- **Preconditions**:
  - Caller must be `DEFAULT_ADMIN_ROLE`, the batch `producer`, or hold `LABORATORY_ROLE` / `AUDITOR_ROLE`.
  - Batch must exist and not already be `Recalled`.
- **Postconditions**:
  - Sets `status = BatchStatus.Recalled`.
  - Emits `BatchRecalled`.

### 7.2 Read Functions

#### `getBatch`
Retrieves current batch state.
```solidity
function getBatch(bytes32 batchId) external view returns (HoneyBatch memory);
```

#### `batchExists`
Check if a batch ID has been registered.
```solidity
function batchExists(bytes32 batchId) external view returns (bool);
```

---

## 8. Backend ↔ Blockchain Interface Specification

### 8.1 Write Workflow (Backend → Blockchain)

```text
Backend Event (e.g. Beekeeper creates batch in UI)
       │
       ▼
1. Persist operational batch in MongoDB
       │
       ▼
2. Compute canonical metadata hash:
   metadataHash = "0x" + crypto.createHash("sha256").update(canonicalMetadataJSON).digest("hex")
       │
       ▼
3. Select appropriate server-side wallet (BEEKEEPER_PRIVATE_KEY)
       │
       ▼
4. Send ethers.js transaction:
   contract.connect(beekeeperWallet).registerBatch(batchId, quantityGrams, metadataHash, harvestTimestamp)
       │
       ▼
5. Wait for 1 block confirmation on Ethereum Sepolia
       │
       ▼
6. Update MongoDB record with txHash, blockNumber, and onChainStatus = "CONFIRMED"
```

### 8.2 Read / Verification Workflow (Blockchain → Backend)

When a consumer scans a QR code containing `batchId`:

```text
Consumer Scans QR (batchId)
       │
       ▼
Backend Verification Service
       ├── Fetch MongoDB document (source hives, beekeeper profile, lab PDF url, AI summary)
       ├── Call contract.getBatch(batchId) via Sepolia RPC
       └── Query historical event logs:
             const registeredEvents = await contract.queryFilter(contract.filters.BatchRegistered(batchId));
             const certifiedEvents  = await contract.queryFilter(contract.filters.BatchCertified(batchId));
             const custodyEvents    = await contract.queryFilter(contract.filters.CustodyTransferred(batchId));
             const recallEvents     = await contract.queryFilter(contract.filters.BatchRecalled(batchId));
       │
       ▼
Reconstruct Timeline Object & Compare:
  - Verify MongoDB metadata hash === onChain metadataHash (Tamper Detection)
  - Verify MongoDB lab certificate hash === onChain labReportHash
  - Assemble chronological custody chain: Beekeeper -> Processor -> Distributor -> Store
       │
       ▼
Return Verified Provenance Payload to Web / Mobile Frontend
```

### 8.3 Consumer Verification Payload Schema (JSON Example)

```json
{
  "batchId": "0x4a726191b2c6...3f",
  "verifiedOnChain": true,
  "blockchain": {
    "network": "Ethereum Sepolia",
    "chainId": 11155111,
    "contractAddress": "0x1234...5678",
    "status": "Delivered",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0x9ab...c12"
  },
  "quality": {
    "grade": "GradeA",
    "moisturePercentage": 17.80,
    "certifiedBy": "0xLabAddress987...",
    "labReportHash": "0x8f3c...11a",
    "labCertificateDownloadUrl": "https://api.honeychain.org/reports/lab-8f3c.pdf"
  },
  "harvest": {
    "producer": "0xBeekeeperAddress123...",
    "beekeeperName": "Sundarbans Wild Honey Co-op",
    "harvestTimestamp": 1725732000,
    "quantityKg": 25.0,
    "floralOrigin": "Mangrove Wildflower",
    "hiveIds": ["HIVE-SB-01", "HIVE-SB-04", "HIVE-SB-09"]
  },
  "custodyTimeline": [
    {
      "stage": "Harvest & Batch Registration",
      "actor": "0xBeekeeperAddress123...",
      "role": "BEEKEEPER",
      "timestamp": 1725732000,
      "txHash": "0x1111..."
    },
    {
      "stage": "Lab Quality Certification",
      "actor": "0xLabAddress987...",
      "role": "LABORATORY",
      "timestamp": 1725746400,
      "txHash": "0x2222..."
    },
    {
      "stage": "Custody Transfer to Processing",
      "from": "0xBeekeeperAddress123...",
      "to": "0xProcessorAddress456...",
      "location": "Kolkata Processing Center",
      "timestamp": 1725760800,
      "txHash": "0x3333..."
    },
    {
      "stage": "Retail Distribution",
      "from": "0xProcessorAddress456...",
      "to": "0xDistributorAddress789...",
      "location": "Delhi Retail Hub",
      "timestamp": 1725790000,
      "txHash": "0x4444..."
    }
  ]
}
```

---

## 9. Implementation & Automated Test Verification

The smart contract is implemented in [`blockchain/contracts/HoneyChainRegistry.sol`](file:///home/dhritish/Documents/githubFinal/HoneyChain_Backend/blockchain/contracts/HoneyChainRegistry.sol).

### 9.1 Custom Error Mapping
- `BatchAlreadyExists(bytes32 batchId)`: Thrown when trying to register an existing `batchId`.
- `BatchDoesNotExist(bytes32 batchId)`: Thrown when accessing or modifying an unharvested batch.
- `BatchAlreadyRecalled(bytes32 batchId)`: Thrown when attempting custody transfer or certification on a recalled batch.
- `BatchAlreadyCertified(bytes32 batchId)`: Thrown when attempting duplicate lab certification.
- `InvalidBatchId()`: Thrown when `batchId == bytes32(0)`.
- `InvalidQuantity()`: Thrown when `quantityGrams == 0`.
- `InvalidMetadataHash()`: Thrown when `metadataHash == bytes32(0)`.
- `InvalidLabReportHash()`: Thrown when `labReportHash == bytes32(0)`.
- `InvalidQualityGrade()`: Thrown when `qualityGrade == QualityGrade.None`.
- `InvalidRecipient()`: Thrown when `to == address(0)` or `to == msg.sender`.
- `NotCurrentCustodian(address caller, address currentCustodian)`: Thrown when a non-custodian attempts custody transfer.
- `UnauthorizedRecall(address caller)`: Thrown when caller lacks admin, auditor, lab, or producer rights to recall.
- `RecipientNotAuthorized(address recipient)`: Thrown when transferring to an account lacking supply chain roles (`PROCESSOR_ROLE`, `DISTRIBUTOR_ROLE`, `BEEKEEPER_ROLE`).

### 9.2 Test Coverage (16 Automated Tests in Hardhat)
Executed via `npm test` (`npx hardhat test`):

```text
  HoneyChainRegistry
    1. Registration
      ✔ 1. authorized registration: beekeeper can register batch
      ✔ 2. unauthorized registration: non-beekeeper caller is rejected
      ✔ 3. duplicate registration: cannot register existing batch ID
      ✔ should revert if batchId, quantity or metadataHash are invalid
    2. Certification
      ✔ 4. valid certification: laboratory certifies batch
      ✔ 5. certification before registration: cannot certify non-existent batch
      ✔ 6. unauthorized certification: non-lab caller is rejected
      ✔ duplicate certification: cannot certify an already certified batch
    3. Custody Transfer
      ✔ 7. valid transfer: custodian transfers custody to authorized participants
      ✔ 8. unauthorized transfer: non-custodian cannot transfer custody
      ✔ 9. invalid/non-owner transfer: transfer to self or zero address or unauthorized recipient
    4. Recall Operations
      ✔ 10. valid recall: admin, producer, lab, or auditor can recall batch
      ✔ 11. unauthorized recall: unauthorized user or processor cannot recall
      ✔ 12. transfer after recall: cannot transfer or certify a recalled batch
    5. Event Emission & State Integrity
      ✔ 13. correct event emission: emits all lifecycle events with exact indexed arguments
      ✔ 14. correct batch state: getBatch and batchExists verification

  16 passing (960ms)
```

