# HoneyChain REST API Reference

> **CRITICAL RULE FOR DEVELOPERS & AGENTS:**  
> **API Documentation Maintenance Rule**:  
> Whenever any endpoint is added, modified, or deprecated in the codebase (`backend/src/routes/` or `backend/src/controllers/`), **this file (`docs/api.md`) MUST be updated immediately** in the same pull request or commit to keep the specification synchronized with the implementation.

---

## 1. Overview & Base URLs

The HoneyChain backend is a Node.js/Express (v5) service interfacing with **MongoDB Atlas** for operational data, **Ethereum Sepolia** for tamper-proof provenance, and an internal **Python ML microservice** for hive diagnostics.

| Environment | Base URL |
|---|---|
| **Production (Render)** | `https://honeychain-backend.onrender.com` |
| **Local Development** | `http://localhost:5000` |
| **Internal ML Microservice** | `http://127.0.0.1:5001` (Internal loopback) |

### Common Headers
- `Content-Type: application/json` (Required for `POST` requests with JSON payloads)
- `Accept: application/json` (Preferred for JSON responses; `GET /` serves HTML if `Accept: text/html` is sent)

### Standard Success Envelope
Unless returning HTML or binary/raw data, all responses conform to:
```json
{
  "success": true,
  "data": { ... }
}
```

### Standard Error Envelope
Handled centrally by `backend/src/middlewares/errorHandler.ts`:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable explanation of error",
    "stack": "Stack trace (included only in NODE_ENV=development)"
  }
}
```

---

## 2. API Index & Quick Route Map

| Category | Method | Path | Access | Purpose |
|---|---|---|---|---|
| **System** | `GET` | `/` | Public | Backend landing info / HTML frontend |
| **System** | `GET` | `/health` | Public | Production liveness & readiness check |
| **Consumer Web** | `GET` | `/verify` | Public | Consumer QR verification web portal |
| **Consumer Web** | `GET` | `/verify/:batchId` | Public | Consumer QR verification page for specific batch |
| **Batches** | `POST` | `/api/batches` | Beekeeper | Register new harvest batch (On-Chain + DB) |
| **Batches** | `POST` | `/api/batches/:batchId/quality` | Laboratory | Submit quality test & grade (On-Chain + DB) |
| **Batches** | `POST` | `/api/batches/:batchId/transfer` | Custodian | Transfer custody to processor/distributor |
| **Batches** | `POST` | `/api/batches/:batchId/recall` | Auditor/Admin | Recall contaminated/adulterated batch |
| **Batches** | `GET` | `/api/batches/:batchId/qr` | Public | Generate packaging QR code (PNG Data URL + SVG) |
| **Verification** | `GET` | `/api/verify/:batchId` | Public | On-chain provenance verification & tamper audit |
| **IoT Telemetry** | `POST` | `/api/iot/telemetry` | Gateway/Device | Ingest edge sensor reading with validation |
| **IoT Telemetry** | `ALL` | `/api/iot/simulate` | Dev/Internal | Trigger simulated telemetry cycle across hives |
| **AI / ML** | `GET` | `/api/ml/health` | Public | Probe Python ML microservice & loaded tiers |
| **AI / ML** | `POST` | `/api/ml/predict/:hiveId` | Public/Beekeeper| Run real-time multi-tier ML colony health inference |
| **AI / ML** | `GET` | `/api/ml/predictions/:hiveId` | Public | Paginated prediction history for a hive |
| **AI / ML** | `GET` | `/api/ml/latest/:hiveId` | Public | Get most recent cached prediction for a hive |

---

## 3. System & Health Endpoints

### 3.1 Service Information & Root Landing
- **Route**: `GET /`
- **Access**: Public
- **Description**: Returns HTML landing page if requested via browser (`Accept: text/html`), otherwise returns server operational metadata in JSON.

#### Example JSON Response (`200 OK`)
```json
{
  "success": true,
  "message": "HoneyChain backend is running yehh",
  "version": "1.0.0",
  "network": "Ethereum Sepolia"
}
```

---

### 3.2 Production Health Probe
- **Route**: `GET /health`
- **Access**: Public (used by Render health checks, load balancers, and monitoring agents)
- **Description**: Verifies MongoDB connectivity and reports system uptime and blockchain network metadata.

#### Status Codes
- `200 OK`: Database connected (`status: "ok"`).
- `503 Service Unavailable`: Database disconnected or initializing (`status: "degraded"`).

#### Example Response (`200 OK`)
```json
{
  "status": "ok",
  "timestamp": "2026-09-08T14:25:30.123Z",
  "uptimeSeconds": 1420,
  "database": {
    "status": "connected"
  },
  "blockchain": {
    "network": "Ethereum Sepolia",
    "chainId": 11155111
  }
}
```

---

### 3.3 Consumer Verification Web Page
- **Route**: `GET /verify` or `GET /verify/:batchId`
- **Access**: Public (Consumer web browser)
- **Description**: Serves the responsive, mobile-optimized HTML/CSS/JS verification single-page app (`frontend/verify.html`). When `:batchId` is included in the URL, the client-side JavaScript automatically extracts the ID and calls `GET /api/verify/:batchId` to display real-time on-chain provenance.
- **Content-Type**: `text/html; charset=utf-8`

---

## 4. Batch & Provenance Endpoints (`/api/batches`)

### 4.1 Register Honey Batch
- **Route**: `POST /api/batches`
- **Access**: Beekeeper Role (Transaction signed by server-side `BEEKEEPER_PRIVATE_KEY`)
- **Description**: 
  1. Validates harvest metadata, quantity, and geographic location.
  2. Computes the deterministic SHA-256 hash of the canonical metadata.
  3. Stages the draft batch document in MongoDB.
  4. Submits `registerBatch(batchIdBytes32, quantityGrams, metadataHash, harvestTimestamp)` to the `HoneyChainRegistry.sol` smart contract on Ethereum Sepolia.
  5. On transaction receipt, records `txHash`, `blockNumber`, and `gasUsed` in MongoDB.
  6. *Atomic Rollback*: If the blockchain transaction fails or reverts, the staged MongoDB record is purged to guarantee database-ledger consistency.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `batchId` | string | Optional | Custom unique batch identifier (e.g., `HC-BATCH-2026-001`). If omitted, auto-generated. |
| `quantityGrams` | number | **Required** | Weight in grams (must be a positive integer, e.g., `50000` = 50 kg). |
| `floralOrigin` | string | **Required** | Primary botanical/floral source (e.g., `Multifloral Forest`, `Mustard Blossom`, `Acacia`). |
| `sourceHives` | string[] | Optional | Array of source hive IDs (e.g., `["HIVE-001", "HIVE-002"]`). Default: `[]`. |
| `apiaryLocation` | object | **Required** | Harvest geolocation. Must include `latitude`, `longitude`, and `region`. |
| `apiaryLocation.latitude` | number | **Required** | Decimal latitude (-90 to 90). |
| `apiaryLocation.longitude` | number | **Required** | Decimal longitude (-180 to 180). |
| `apiaryLocation.region` | string | **Required** | Descriptive name (e.g., `Sundarbans Biosphere Reserve`). |
| `apiaryLocation.elevationMeters`| number | Optional | Elevation above sea level in meters. |
| `harvestTimestamp` | number | Optional | Unix epoch in seconds. Defaults to current timestamp. |
| `extraMetadata` | object | Optional | Arbitrary key-value pairs hashed into batch commitment. |

#### Example Request
```json
{
  "batchId": "HC-BATCH-2026-001",
  "quantityGrams": 45000,
  "floralOrigin": "Sundarbans Wild Mangrove",
  "sourceHives": ["HIVE-001", "HIVE-002"],
  "apiaryLocation": {
    "latitude": 21.9497,
    "longitude": 89.1833,
    "region": "Sundarbans Core Mangrove Zone",
    "elevationMeters": 4
  },
  "harvestTimestamp": 1773000000,
  "extraMetadata": {
    "extractionMethod": "Cold-pressed raw centrifugal",
    "organicCertification": "NPOP-IND-2026-99"
  }
}
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "message": "Honey batch registered successfully on Ethereum Sepolia",
  "data": {
    "_id": "66dd8e45...",
    "batchId": "HC-BATCH-2026-001",
    "batchIdBytes32": "0x48432d42415443482d323032362d303031000000000000000000000000000000",
    "producer": "0x446B8472f913dD13E424911d331908C8227b13eF",
    "currentCustodian": "0x446B8472f913dD13E424911d331908C8227b13eF",
    "quantityGrams": 45000,
    "harvestTimestamp": 1773000000,
    "floralOrigin": "Sundarbans Wild Mangrove",
    "sourceHives": ["HIVE-001", "HIVE-002"],
    "status": "Registered",
    "metadataHash": "0x98f480398f6d63e9f3ab397940254303352723049b77543d8383f512703b8d4e",
    "blockchain": {
      "network": "Ethereum Sepolia",
      "chainId": 11155111,
      "contractAddress": "0x6331bEb93B6713e7Fca3d01Ff7871b6A5D2983bF",
      "registrationConfirmed": true,
      "registrationTxHash": "0x892af45f91e92d8e...",
      "registrationBlock": 6591024,
      "registrationGasUsed": "162450"
    }
  },
  "blockchain": {
    "txHash": "0x892af45f91e92d8e...",
    "blockNumber": 6591024,
    "gasUsed": "162450",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0x892af45f91e92d8e..."
  }
}
```

#### Error Codes
- `400 Bad Request`: Missing mandatory fields (`quantityGrams <= 0`, missing `floralOrigin`, or invalid `apiaryLocation`).
- `409 Conflict`: `batchId` already exists in MongoDB.
- `500 Internal Server Error`: Smart contract reverted (e.g., unauthorized signer, invalid bytes32 conversion).

---

### 4.2 Certify Batch Quality
- **Route**: `POST /api/batches/:batchId/quality`
- **Access**: Laboratory Role (Signed by `LAB_PRIVATE_KEY`)
- **Description**: Submits chemical analysis and laboratory grading for a registered batch. Broadcasts `certifyBatch(batchIdBytes32, labReportHash, qualityGradeEnum, moistureBasisPoints)` to Sepolia.

#### Path Parameters
- `batchId` (string, required): The target batch ID.

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `grade` | string | **Required** | Quality classification. Must be one of: `"GradeA"`, `"GradeB"`, `"GradeC"`, `"Substandard"`. |
| `moisturePercentage` | number | **Required** | Measured moisture percentage (positive number `> 0` and `<= 100`, e.g., `17.50`). Converted internally to basis points (`1750`). |
| `labReportData` | object | Optional | Detailed chemical assay (sugars, HMF, pollen count, diastase number). |
| `labReportHash` | string | Optional | 32-byte hex hash of the lab document. Auto-calculated if omitted. |

#### Example Request
```json
{
  "grade": "GradeA",
  "moisturePercentage": 17.50,
  "labReportData": {
    "fructosePercentage": 38.4,
    "glucosePercentage": 31.2,
    "sucrosePercentage": 1.1,
    "hmfMgKg": 11.8,
    "pollenProfile": "92% Avicennia marina dominant"
  }
}
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Batch quality certified successfully on Ethereum Sepolia",
  "data": {
    "batchId": "HC-BATCH-2026-001",
    "status": "Certified",
    "quality": {
      "grade": "GradeA",
      "moisturePercentage": 17.5,
      "moistureBasisPoints": 1750,
      "labReportHash": "0x7a22...f09",
      "certifiedBy": "0x19a0A84D5fB5C8271...E8",
      "certifiedAt": 1773001200,
      "txHash": "0xb61c...74e"
    }
  },
  "blockchain": {
    "txHash": "0xb61c...74e",
    "blockNumber": 6591050,
    "gasUsed": "89300",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0xb61c...74e"
  }
}
```

#### Error Codes
- `400 Bad Request`: Invalid grade string, moisture percentage out of range `(0, 100]`, batch already recalled, or batch not in `Registered` status.
- `404 Not Found`: Batch does not exist.

---

### 4.3 Transfer Batch Custody
- **Route**: `POST /api/batches/:batchId/transfer`
- **Access**: Current Custodian (Beekeeper, Processor, or Distributor)
- **Description**: Executes an on-chain custody handoff. Records the new custodian address and geographic checkpoint, transitioning the batch status to `InTransit`.

#### Path Parameters
- `batchId` (string, required): Target batch ID.

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | **Required** | Valid 20-byte Ethereum address (`0x...`) of the recipient. |
| `location` | string | **Required** | Facility/checkpoint location name (e.g., `Kolkata Regional Bottling Plant`). |
| `role` | string | Optional | Role signer to use: `"beekeeper"`, `"processor"`, or `"distributor"`. Defaults according to current status. |

#### Example Request
```json
{
  "to": "0x9876543210987654321098765432109876543210",
  "location": "Kolkata Organic Processing Facility #3",
  "role": "beekeeper"
}
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Batch custody transferred successfully on Ethereum Sepolia",
  "data": {
    "batchId": "HC-BATCH-2026-001",
    "currentCustodian": "0x9876543210987654321098765432109876543210",
    "status": "InTransit",
    "custodyHistory": [
      {
        "from": "0x446B8472f913dD13E424911d331908C8227b13eF",
        "to": "0x9876543210987654321098765432109876543210",
        "location": "Kolkata Organic Processing Facility #3",
        "timestamp": 1773002500,
        "txHash": "0xc83d...11b",
        "blockNumber": 6591080
      }
    ]
  },
  "blockchain": {
    "txHash": "0xc83d...11b",
    "blockNumber": 6591080,
    "gasUsed": "68400",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0xc83d...11b"
  }
}
```

---

### 4.4 Recall Batch
- **Route**: `POST /api/batches/:batchId/recall`
- **Access**: Auditor or Admin Role (Signed by `AUDITOR_PRIVATE_KEY`)
- **Description**: Flags a batch as contaminated, adulterated, or compromised directly on Ethereum Sepolia and locks further transfers.

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | string | **Required** | Reason for recall (e.g., `Antibiotic residue detected above MRL threshold`). |
| `role` | string | Optional | `"auditor"` (default) or `"admin"`. |

#### Example Request
```json
{
  "reason": "Secondary GC-MS test flagged elevated C4 sugar adulteration (14%)",
  "role": "auditor"
}
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Batch recalled successfully on Ethereum Sepolia",
  "data": {
    "batchId": "HC-BATCH-2026-001",
    "status": "Recalled",
    "recall": {
      "recalled": true,
      "reason": "Secondary GC-MS test flagged elevated C4 sugar adulteration (14%)",
      "recalledBy": "0x33A9b140...",
      "recalledAt": 1773003000,
      "txHash": "0xd4e2...88a"
    }
  },
  "blockchain": {
    "txHash": "0xd4e2...88a",
    "blockNumber": 6591100,
    "gasUsed": "48150",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0xd4e2...88a"
  }
}
```

---

### 4.5 Generate Packaging QR Code
- **Route**: `GET /api/batches/:batchId/qr`
- **Access**: Public
- **Description**: Generates consumer QR code payloads designed for print on honey jar labels. Returns both a PNG Data URL (base64) for direct HTML `<img>` rendering and raw vector SVG markup for high-resolution packaging printing. Encodes the public verification URL.

#### Path Parameters
- `batchId` (string, required): Batch ID.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "batchId": "HC-BATCH-2026-001",
  "verificationUrl": "https://honeychain-backend.onrender.com/verify/HC-BATCH-2026-001",
  "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABbBt...",
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 33 33\" shape-rendering=\"crispEdges\">..."
}
```

---

## 5. Consumer & Auditor Verification Endpoint (`/api/verify`)

### 5.1 Verify Batch Provenance & Audit Integrity
- **Route**: `GET /api/verify/:batchId`
- **Access**: Public (Called automatically by the consumer QR verification frontend)
- **Description**: 
  1. Fetches the off-chain batch record from MongoDB.
  2. Queries the `HoneyChainRegistry` smart contract on Ethereum Sepolia via RPC (`getBatch`).
  3. Queries on-chain historical EVM event logs (`queryFilter` for `CustodyTransferred`, `BatchCertified`, etc.) to reconstruct the immutable chronological timeline.
  4. **Cryptographic Tamper Detection**: Recomputes the SHA-256 hash of the off-chain metadata in MongoDB and compares it against the on-chain metadata hash stored on Ethereum.
  5. Flags any hash discrepancies as a data tampering event.

#### Path Parameters
- `batchId` (string, required): Batch ID to verify.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "batchId": "HC-BATCH-2026-001",
  "verifiedOnChain": true,
  "tamperProofAudit": {
    "integrityVerified": true,
    "metadataHashMatch": true,
    "labReportHashMatch": true,
    "onChainMetadataHash": "0x98f480398f6d63e9f3ab397940254303352723049b77543d8383f512703b8d4e",
    "offChainMetadataHash": "0x98f480398f6d63e9f3ab397940254303352723049b77543d8383f512703b8d4e"
  },
  "blockchain": {
    "network": "Ethereum Sepolia",
    "chainId": 11155111,
    "contractAddress": "0x6331bEb93B6713e7Fca3d01Ff7871b6A5D2983bF",
    "status": "Certified",
    "producer": "0x446B8472f913dD13E424911d331908C8227b13eF",
    "currentCustodian": "0x446B8472f913dD13E424911d331908C8227b13eF",
    "registrationTxHash": "0x892af45f91e92d8e...",
    "etherscanUrl": "https://sepolia.etherscan.io/tx/0x892af45f91e92d8e..."
  },
  "quality": {
    "grade": "GradeA",
    "moisturePercentage": 17.5,
    "certifiedBy": "0x19a0A84D5fB5C8271...",
    "certificationTimestamp": 1773001200,
    "labReportHash": "0x7a22...f09",
    "labReportData": {
      "fructosePercentage": 38.4,
      "glucosePercentage": 31.2,
      "sucrosePercentage": 1.1,
      "hmfMgKg": 11.8,
      "pollenProfile": "92% Avicennia marina dominant"
    }
  },
  "harvest": {
    "producer": "0x446B8472f913dD13E424911d331908C8227b13eF",
    "harvestTimestamp": 1773000000,
    "quantityGrams": 45000,
    "quantityKg": 45,
    "floralOrigin": "Sundarbans Wild Mangrove",
    "sourceHives": ["HIVE-001", "HIVE-002"],
    "apiaryLocation": {
      "latitude": 21.9497,
      "longitude": 89.1833,
      "region": "Sundarbans Core Mangrove Zone",
      "elevationMeters": 4
    }
  },
  "custodyTimeline": [
    {
      "from": "0x446B8472f913dD13E424911d331908C8227b13eF",
      "to": "0x446B8472f913dD13E424911d331908C8227b13eF",
      "location": "Sundarbans Core Mangrove Zone",
      "timestamp": 1773000000,
      "txHash": "0x892af45f...",
      "blockNumber": 6591024
    }
  ]
}
```

#### Error Codes
- `404 Not Found`: Batch does not exist in the database, or is stored locally but was never broadcast to Sepolia by an authorized Beekeeper.

---

## 6. IoT Telemetry Endpoints (`/api/iot`)

### 6.1 Ingest Telemetry Reading
- **Route**: `POST /api/iot/telemetry`
- **Access**: Edge Apiary Gateway / ESP32 Device
- **Description**: 
  1. Validates strict physical boundaries (Temperature `-40°C` to `70°C`, Humidity `0%` to `100%`, Weight `0` to `300 kg`, Battery `0%` to `100%`).
  2. Protects against future clock drift (`<= 10 minutes` into future).
  3. Verifies target hive exists and is active (`status !== "inactive"` and `status !== "collapsed"`).
  4. **Idempotency**: Prevents duplicate insertions on network retries matching on `deviceId` + `timestamp`.
  5. Inserts into MongoDB `SensorReading` collection.
  6. Updates `Hive` document with `lastPingAt`, `batteryLevelPct`, and `latestReadingAt`.

#### Request Body
| Field | Type | Required | Valid Range / Description |
|---|---|---|---|
| `deviceId` | string | **Required** | Edge hardware identifier (e.g. `ESP32-GATEWAY-001`). |
| `hiveId` | string | **Required** | Target hive identifier (e.g. `HIVE-001`). |
| `timestamp` | string \| number | **Required** | ISO 8601 string or epoch ms. |
| `temperature` | number | **Required** | Internal hive temperature in °C (`-40` to `70`). |
| `humidity` | number | **Required** | Internal hive relative humidity % (`0` to `100`). |
| `weightKg` | number | **Required** | Gross hive weight in kg (`0` to `300`). |
| `batteryLevelPct` | number | **Required** | Node battery percentage (`0` to `100`). |
| `soundFrequencyHz`| number | Optional | Dominant audio frequency in Hz (`0` to `5000`). |
| `acousticsDb` | number | Optional | Sound pressure level in dB (`0` to `140`). |
| `ambientTemperature`| number | Optional | External ambient temperature in °C (`-50` to `70`). |
| `ambientHumidity` | number | Optional | External ambient humidity % (`0` to `100`). |
| `flow` | number | Optional | Net bee traffic rate. |
| `beeInCount` | number | Optional | Inbound bee counter count. |
| `beeOutCount` | number | Optional | Outbound bee counter count. |
| `metadata` | object | Optional | Auxiliary hardware status (e.g. `{ "rssi": -65 }`). |

#### Example Request
```json
{
  "deviceId": "ESP32-GATEWAY-001",
  "hiveId": "HIVE-001",
  "timestamp": "2026-09-08T10:30:00.000Z",
  "temperature": 35.2,
  "humidity": 62.5,
  "weightKg": 42.8,
  "batteryLevelPct": 94,
  "soundFrequencyHz": 245.0,
  "acousticsDb": 68.4,
  "ambientTemperature": 31.0,
  "ambientHumidity": 75.0,
  "flow": 12,
  "beeInCount": 350,
  "beeOutCount": 338,
  "metadata": {
    "source": "esp32-wifi",
    "rssi": -62
  }
}
```

#### Example Response (`201 Created` - First Ingestion)
```json
{
  "success": true,
  "duplicate": false,
  "message": "Telemetry reading ingested successfully",
  "data": {
    "_id": "66dd8f1a...",
    "hiveId": "HIVE-001",
    "deviceId": "ESP32-GATEWAY-001",
    "timestamp": "2026-09-08T10:30:00.000Z",
    "temperature": 35.2,
    "humidity": 62.5,
    "weightKg": 42.8,
    "batteryLevelPct": 94,
    "createdAt": "2026-09-08T10:30:01.100Z"
  }
}
```

#### Example Response (`200 OK` - Duplicate/Retry)
```json
{
  "success": true,
  "duplicate": true,
  "message": "Telemetry reading already ingested for this device and timestamp",
  "data": { ...existingReading... }
}
```

---

### 6.2 Trigger Telemetry Simulation Cycle
- **Route**: `ALL /api/iot/simulate` (Supports `GET` & `POST`)
- **Access**: Public / Development Testing
- **Description**: Generates and ingests synthetic physical readings across all active hives in the database. Useful for demo rehearsals and continuous ML feature testing without real hardware connected.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Simulation cycle completed: 12/12 readings ingested into MongoDB",
  "data": {
    "success": true,
    "total": 12,
    "successful": 12,
    "failed": 0,
    "readings": [ ... ]
  }
}
```

---

## 7. Hive Health AI / ML Inference Endpoints (`/api/ml`)

The ML subsystem runs a co-located Python inference microservice (`backend/ml/inference_server.py`) serving a multi-tier LightGBM classifier trained on hive telemetry.

### 7.1 ML Microservice Health & Model Tiers
- **Route**: `GET /api/ml/health`
- **Access**: Public
- **Description**: Returns the operational status of the internal Python process and lists the loaded classification tiers (`T1` up to `T48`).

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "uptime": 4520.1,
    "activeModel": "lightgbm-multitier",
    "loadedTiers": ["T1", "T2", "T6", "T12", "T24", "T48"],
    "pythonVersion": "3.11.8",
    "microserviceUrl": "http://127.0.0.1:5001"
  }
}
```

---

### 7.2 Predict Hive Health
- **Route**: `POST /api/ml/predict/:hiveId`
- **Access**: Public / Beekeeper
- **Description**: 
  1. Queries the latest 48 sensor readings for the specified hive from MongoDB.
  2. Converts UTC timestamps to Indian Standard Time (IST, UTC+5:30) for diurnal solar cycle alignment.
  3. Determines optimal inference tier based on available reading count (`T48` > `T24` > `T12` > `T6` > `T2` > `T1`).
  4. Dispatches feature matrix to local Python inference microservice (`http://127.0.0.1:5001/predict`).
  5. Translates model output to health status (`HEALTHY`, `VARROA_STRESS`, `SWARMING_RISK`, `QUEEN_ABSENT`, `FEEDING_REQUIRED`, `COLD_STRESS`).
  6. Automatically saves prediction to the `AIPrediction` collection in MongoDB (unless `?persist=false`).

#### Path Parameters
- `hiveId` (string, required): Hive identifier (e.g. `HIVE-001`).

#### Query Parameters
- `persist` (boolean, optional): Set to `false` to run dry-run inference without persisting to MongoDB. Default: `true`.

#### Example Request
```http
POST /api/ml/predict/HIVE-001
```

#### Example Response (`200 OK` - Inference Successful)
```json
{
  "success": true,
  "status": "OK",
  "data": {
    "prediction": {
      "hiveId": "HIVE-001",
      "tier": "T48",
      "status": "HEALTHY",
      "confidence": 0.942,
      "anomaliesDetected": [],
      "alerts": [],
      "recommendations": [
        "Colony metrics are within optimal parameters.",
        "Maintain regular inspection schedule."
      ],
      "metricsSnapshot": {
        "temperature": 35.1,
        "humidity": 62.3,
        "weightKg": 44.5,
        "soundFrequencyHz": 240
      },
      "timestamp": "2026-09-08T14:30:00.000Z"
    },
    "modelOutput": {
      "rawPrediction": 0,
      "probabilities": [0.942, 0.025, 0.015, 0.008, 0.006, 0.004],
      "tierUsed": "T48",
      "featuresExtracted": 42
    }
  }
}
```

#### Example Response (`200 OK` - Insufficient Telemetry)
```json
{
  "success": false,
  "status": "INSUFFICIENT_DATA",
  "message": "Hive requires at least 1 sensor reading for inference. Found 0.",
  "data": null
}
```

#### Example Response (`503 Service Unavailable` - Python Microservice Down)
```json
{
  "success": false,
  "status": "SERVICE_UNAVAILABLE",
  "message": "ML microservice is unreachable at http://127.0.0.1:5001",
  "data": null
}
```

---

### 7.3 Historical Predictions for a Hive
- **Route**: `GET /api/ml/predictions/:hiveId`
- **Access**: Public
- **Description**: Returns a paginated list of past AI predictions for trend analysis and historical graphing.

#### Path Parameters
- `hiveId` (string, required): Hive identifier.

#### Query Parameters
- `page` (number, optional): 1-indexed page number (default: `1`).
- `limit` (number, optional): Items per page (default: `20`, max: `100`).

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "hiveId": "HIVE-001",
    "predictions": [
      {
        "_id": "66dd901a...",
        "tier": "T48",
        "status": "HEALTHY",
        "confidence": 0.942,
        "metricsSnapshot": {
          "temperature": 35.1,
          "humidity": 62.3,
          "weightKg": 44.5
        },
        "createdAt": "2026-09-08T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 35,
      "page": 1,
      "limit": 20,
      "pages": 2
    }
  }
}
```

---

### 7.4 Latest Prediction for a Hive
- **Route**: `GET /api/ml/latest/:hiveId`
- **Access**: Public
- **Description**: Fast query returning the single most recent cached prediction document for quick dashboard status widgets.

#### Path Parameters
- `hiveId` (string, required): Hive identifier.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "_id": "66dd901a...",
    "hiveId": "HIVE-001",
    "tier": "T48",
    "status": "HEALTHY",
    "confidence": 0.942,
    "anomaliesDetected": [],
    "alerts": [],
    "recommendations": [
      "Colony metrics are within optimal parameters."
    ],
    "metricsSnapshot": {
      "temperature": 35.1,
      "humidity": 62.3,
      "weightKg": 44.5,
      "soundFrequencyHz": 240
    },
    "createdAt": "2026-09-08T14:30:00.000Z"
  }
}
```

#### Error Codes
- `404 Not Found`: No AI predictions recorded for the given hive.

---

## 8. Development & Rule Enforcement

> [!IMPORTANT]
> **To all developers and AI coding agents:**  
> If you create a new route in `backend/src/routes/` or modify parameters/responses in `backend/src/controllers/`, you **MUST update this document (`docs/api.md`)** before pushing or opening a PR. Keep table summaries, schema types, query parameters, and JSON payloads in sync!
