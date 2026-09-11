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
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate with email/password; returns JWT |
| **Auth** | `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated caller profile & role wallet |
| **Auth** | `POST` | `/api/auth/logout` | Public | Terminate session & clear cookies |
| **Auth** | `POST` | `/api/auth/activate` | Public (Token) | Activate Organization Admin account & set password |
| **Auth** | `POST` | `/api/auth/users` | Admin | Create new application user with designated role |
| **Auth** | `GET` | `/api/auth/wallets` | Public | Get public addresses for all 5 stakeholder wallets |
| **Organizations** | `POST` | `/api/organizations/apply` | Public | Submit organization registration application (PENDING) |
| **Organizations** | `POST` | `/api/organizations/upload-doc` | Public | Upload optional supporting PDF document |
| **Organizations** | `GET` | `/api/organizations/applications` | Admin | List pending/filtered organization applications |
| **Organizations** | `GET` | `/api/organizations/applications/:id` | Admin | Retrieve detailed application by id |
| **Organizations** | `POST` | `/api/organizations/applications/:id/approve` | Admin | Approve application, activate Org & Admin, assign wallet |
| **Organizations** | `POST` | `/api/organizations/applications/:id/reject` | Admin | Reject application with mandatory reason |
| **Organizations** | `GET` | `/api/organizations/my` | Authenticated | View current user's organization profile |
| **Organizations** | `GET` | `/api/organizations/my/members` | Org Admin/Admin | List members of caller's organization |
| **Organizations** | `POST` | `/api/organizations/my/members` | Org Admin/Admin | Add member to organization (tenant isolated) |
| **Organizations** | `PATCH` | `/api/organizations/my/members/:userId/status` | Org Admin/Admin | Activate/deactivate organization member |
| **Organizations** | `GET` | `/api/organizations` | Admin | List all registered organizations |
| **Organizations** | `PATCH` | `/api/organizations/:id/status` | Admin | Suspend or activate an organization |
| **Batches** | `POST` | `/api/batches` | Beekeeper | Register new harvest batch (On-Chain + DB) |
| **Batches** | `POST` | `/api/batches/:batchId/quality` | Laboratory | Submit quality test & grade (On-Chain + DB) |
| **Batches** | `POST` | `/api/batches/:batchId/transfer` | Custodian | Transfer custody (Beekeeper, Processor, Distributor) |
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

## 4. Authentication & Authorization Endpoints (`/api/auth`)

HoneyChain implements role-based access control (RBAC) with JWT tokens. Application users authenticate with email and password to receive a Bearer token. The backend maps the user's role to one of **5 server-managed blockchain stakeholder wallets** (Beekeeper, Laboratory, Processor, Distributor, Auditor). Private keys are never exposed to clients.

### 4.1 Stakeholder Login
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Description**: Authenticates application users with email and password. Returns a signed JWT valid for 7 days, user details, and the on-chain wallet address bound to their role. Also sets an HTTP-only session cookie.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | **Required** | User email (case-insensitive). |
| `password` | string | **Required** | User password. |

#### Example Request
```json
{
  "email": "beekeeper@honeychain.org",
  "password": "Password123!"
}
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66dd901a1f28bc0012a45678",
    "name": "Rajesh Kumar (Beekeeper)",
    "email": "beekeeper@honeychain.org",
    "role": "beekeeper",
    "organization": {
      "_id": "66dd901a1f28bc0012a45600",
      "name": "Sundarbans Apiary Cooperative",
      "role": "beekeeper",
      "walletAddress": "0x446b8472f913dd13e424911d331908c8227b13ef"
    },
    "walletAddress": "0x446B8472f913dD13E424911d331908C8227b13eF"
  }
}
```

#### Error Codes
- `400 Bad Request`: Missing `email` or `password`.
- `401 Unauthorized`: Invalid credentials or deactivated account.

---

### 4.2 Get Authenticated Profile
- **Route**: `GET /api/auth/me`
- **Access**: Authenticated (`Authorization: Bearer <token>`)
- **Description**: Returns the profile, role, organization, and bound blockchain wallet address of the calling user.

#### Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "id": "66dd901a1f28bc0012a45678",
    "name": "Dr. Ananya Sen (Laboratory Analyst)",
    "email": "lab@honeychain.org",
    "role": "lab",
    "organization": {
      "name": "National Honey Quality Testing Laboratory",
      "walletAddress": "0x19a0a84d5fb5c82713e7fca3d01ff7871b6a5d29"
    },
    "walletAddress": "0x19a0A84D5fB5C82713e7Fca3d01Ff7871b6A5D29",
    "createdAt": "2026-09-08T15:00:00.000Z"
  }
}
```

#### Error Codes
- `401 Unauthorized`: Missing, expired, or invalid token.

---

### 4.3 Stakeholder Logout
- **Route**: `POST /api/auth/logout`
- **Access**: Public
- **Description**: Clears HTTP-only `token` and `jwt` authentication cookies.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4.4 Account Activation
- **Route**: `POST /api/auth/activate`
- **Access**: Public (Token-authorized)
- **Description**: Activates a newly approved Organization Admin account using the secure one-time activation token issued upon HoneyChain Admin approval. Sets the admin's initial password, sets `isActive = true`, and returns an authentication JWT.

#### Request Body
```json
{
  "token": "4f8a1bc7e2d9483c10a56e7f82b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
  "password": "SecurePassword123!"
}
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Account activated successfully. Password has been set.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66dd901b...",
    "name": "Rajesh Kumar",
    "email": "rajesh.admin@sundarbans.org",
    "role": "beekeeper",
    "isOrgAdmin": true,
    "organization": "66dd901a...",
    "isActive": true
  }
}
```

---

### 4.5 Admin User Provisioning
- **Route**: `POST /api/auth/users`
- **Access**: Admin Role (`authorize("admin")`)
- **Description**: Creates a new application user with a designated role. Non-admin users are strictly forbidden from assigning roles.

#### Request Headers
```http
Authorization: Bearer <Admin_JWT_Token>
Content-Type: application/json
```

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Required** | User's full name. |
| `email` | string | **Required** | Unique user email. |
| `password` | string | **Required** | Initial password (min 6 characters). |
| `role` | string | **Required** | Must be one of: `"admin"`, `"beekeeper"`, `"processor"`, `"lab"`, `"distributor"`, `"auditor"` (or `"transporter"` for legacy compatibility). |
| `organizationId` | string | Optional | MongoDB ObjectId of associated Organization. |

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "66dd915f...",
    "name": "Vikram Patel",
    "email": "processor2@honeychain.org",
    "role": "processor",
    "isActive": true,
    "createdAt": "2026-09-08T15:20:00.000Z"
  }
}
```

#### Error Codes
- `400 Bad Request`: Validation failure (short password, invalid role, missing fields).
- `401 Unauthorized`: Missing or invalid admin token.
- `403 Forbidden`: Caller is not an `admin`.
- `409 Conflict`: Email already registered.

---

### 4.5 Stakeholder Wallets Directory
- **Route**: `GET /api/auth/wallets`
- **Access**: Public
- **Description**: Lists all 5 blockchain stakeholder identities and their public Ethereum Sepolia wallet addresses.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "wallets": {
    "beekeeper": {
      "role": "beekeeper",
      "walletAddress": "0x446B8472f913dD13E424911d331908C8227b13eF",
      "onChainRole": "BEEKEEPER_ROLE"
    },
    "lab": {
      "role": "lab",
      "walletAddress": "0x19a0A84D5fB5C82713e7Fca3d01Ff7871b6A5D29",
      "onChainRole": "LABORATORY_ROLE"
    },
    "processor": {
      "role": "processor",
      "walletAddress": "0x8D34e7768603473001aEDc1b5eD82C05CbaF6C34",
      "onChainRole": "PROCESSOR_ROLE"
    },
    "distributor": {
      "role": "distributor",
      "walletAddress": "0x33A9b1405eDb784bA94D4e02951C81180bC23c09",
      "onChainRole": "DISTRIBUTOR_ROLE"
    },
    "auditor": {
      "role": "auditor",
      "walletAddress": "0x33A9b1405eDb784bA94D4e02951C81180bC23c09",
      "onChainRole": "AUDITOR_ROLE"
    }
  }
}
```

---

## 5. Organization Onboarding & Governance Endpoints (`/api/organizations`)

HoneyChain implements decentralized, organization-based onboarding. Public entities cannot directly register standalone user accounts; they must submit a registration application which undergoes verification by a HoneyChain Administrator.

### 5.1 Public Organization Application Submission
- **Route**: `POST /api/organizations/apply`
- **Access**: Public
- **Description**: Submits an application to register a new stakeholder organization. The application begins in `PENDING` status. Public users cannot apply for the platform `admin` role.

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `organizationName` | string | **Required** | Registered legal/trading name of the organization. |
| `role` | string | **Required** | One of: `"beekeeper"`, `"processor"`, `"lab"`, `"distributor"`, `"auditor"`. |
| `registrationNumber` | string | Optional | Business/government/FSSAI registration code. |
| `contactEmail` | string | **Required** | Official organization contact email. |
| `contactPhone` | string | Optional | Contact telephone number. |
| `address` | string | Optional | Physical apiary/plant/office address. |
| `adminName` | string | **Required** | Full name of the designated Organization Administrator. |
| `adminEmail` | string | **Required** | Login email for the initial Organization Administrator. |
| `documents` | array | Optional | Array of supporting document objects (`name`, `url`, `fileType`). |

> [!NOTE]
> Passwords are **not** collected during public application submission. Upon HoneyChain Admin approval, a secure activation token is generated for the designated administrator to set their password via `POST /api/auth/activate`.

#### Example Request Body
```json
{
  "organizationName": "Sundarbans Apiary Cooperative",
  "organizationType": "beekeeper",
  "registrationNumber": "WB-COOP-2026-091",
  "contactEmail": "info@sundarbans.org",
  "contactPhone": "+91 98300 11223",
  "address": "Canning Delta Hub, South 24 Parganas, West Bengal",
  "adminName": "Rajesh Kumar",
  "adminEmail": "rajesh.admin@sundarbans.org",
  "documents": [
    {
      "name": "State_Cooperative_Registration.pdf",
      "url": "/uploads/doc-1725890000000-reg.pdf",
      "fileType": "application/pdf"
    }
  ]
}
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "message": "Organization registration application submitted successfully. A HoneyChain Administrator will review your application.",
  "data": {
    "applicationId": "APP-ORG-1725890000000-8472",
    "organizationName": "Sundarbans Apiary Cooperative",
    "organizationType": "beekeeper",
    "role": "beekeeper",
    "status": "PENDING",
    "adminEmail": "rajesh.admin@sundarbans.org",
    "createdAt": "2026-09-09T14:00:00.000Z"
  }
}
```

---

### 5.2 Upload Supporting Document
- **Route**: `POST /api/organizations/upload-doc`
- **Access**: Public (Requires pending application ID)
- **Description**: Accepts base64-encoded PDF documents, validates PDF magic bytes (`%PDF-`), enforces a 10MB size limit, saves to local storage, and securely attaches the document record to the designated pending application.

#### Request Body
```json
{
  "applicationId": "APP-ORG-1725890000000-8472",
  "fileName": "FSSAI_License.pdf",
  "fileData": "JVBERi0xLjQKJeLjz9MK..."
}
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "message": "Document uploaded and attached successfully",
  "applicationId": "APP-ORG-1725890000000-8472",
  "document": {
    "name": "FSSAI_License.pdf",
    "url": "/uploads/doc-1725890000000-9812-FSSAI_License.pdf",
    "fileType": "application/pdf",
    "sizeBytes": 1048576,
    "uploadedAt": "2026-09-09T14:00:00.000Z"
  }
}
```

---

### 5.3 List Organization Applications
- **Route**: `GET /api/organizations/applications`
- **Access**: Admin Role (`authorize("admin")`)
- **Query Parameters**:
  - `status` (string, optional): Filter by `"PENDING"`, `"APPROVED"`, or `"REJECTED"`.
  - `page` (number, default: 1): Pagination page number.
  - `limit` (number, default: 20): Results per page.

---

### 5.4 Approve Organization Application
- **Route**: `POST /api/organizations/applications/:id/approve`
- **Access**: Admin Role (`authorize("admin")`)
- **Description**: Atomically activates the organization, generates a unique Ethereum blockchain identity (with private key encrypted using AES-256-GCM and never exposed), provisions the initial Organization Admin user with `isOrgAdmin: true` and `isActive: false`, issues a 7-day secure activation token, and marks the application `APPROVED` with auditor metadata.

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Organization 'Sundarbans Apiary Cooperative' approved successfully with blockchain identity assigned",
  "data": {
    "application": {
      "applicationId": "APP-ORG-1725890000000-8472",
      "status": "APPROVED",
      "approvedAt": "2026-09-09T14:15:00.000Z"
    },
    "organization": {
      "_id": "66dd901a...",
      "name": "Sundarbans Apiary Cooperative",
      "organizationType": "beekeeper",
      "role": "beekeeper",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "status": "active",
      "isActive": true
    },
    "adminUser": {
      "_id": "66dd901b...",
      "name": "Rajesh Kumar",
      "email": "rajesh.admin@sundarbans.org",
      "role": "beekeeper",
      "isOrgAdmin": true,
      "isActive": false
    },
    "activationToken": "4f8a1bc7e2d9483c10a56e7f82b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    "activation": {
      "activationToken": "4f8a1bc7e2d9483c10a56e7f82b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
      "expiresAt": "2026-09-16T14:15:00.000Z",
      "activationUrl": "/auth/activate?token=4f8a1bc7e2d9483c10a56e7f82b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1"
    }
  }
}
```

---

### 5.5 Reject Organization Application
- **Route**: `POST /api/organizations/applications/:id/reject`
- **Access**: Admin Role (`authorize("admin")`)
- **Request Body**:
```json
{
  "reason": "Missing state NABL honey testing accreditation certification."
}
```

---

### 5.6 View Caller Organization Profile
- **Route**: `GET /api/organizations/my`
- **Access**: Authenticated Member / Org Admin

---

### 5.7 Manage Organization Members
- **Route**: `GET /api/organizations/my/members` — List members in caller's organization.
- **Route**: `POST /api/organizations/my/members` — Add member to caller's organization.
  - **Access**: Organization Admin (`isOrgAdmin: true`) or System Admin.
  - **Tenant Isolation**: Organization Admins can only add members to their own organization. They cannot assign the `admin` role or create members for third-party organizations.
- **Route**: `PATCH /api/organizations/my/members/:userId/status` — Activate or deactivate a member.
  - Organization Admins cannot deactivate their own account or members of other organizations.

---

### 5.8 Organization Governance (Platform Admin)
- **Route**: `GET /api/organizations` — System Admin lists all organizations.
- **Route**: `PATCH /api/organizations/:id/status` — System Admin updates organization status (`"active"` or `"suspended"`). When suspended, members are automatically blocked from accessing protected HoneyChain operations.

---

## 6. Batch & Provenance Endpoints (`/api/batches`)

### 6.1 Register Honey Batch
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

> [!NOTE]
> The edge telemetry simulator is maintained as an independent repository at [HoneyChain_IoT_Simulator](https://github.com/Codewithpabitra/HoneyChain_IoT_Simulator). It simulates ESP32-S3 microcontroller sensor suites deployed in apiaries and transmits stateful telemetry payloads to `POST /api/iot/telemetry`.

### 6.1 High-Frequency Telemetry Ingestion & Real-Time Alerting
- **Route**: `POST /api/iot/telemetry`
- **Access**: Edge Apiary Gateway / ESP32 Device / Standalone Simulator
- **Frequency**: Accepts real-time readings arriving every **15–30 seconds** (`TELEMETRY_EXPECTED_INTERVAL_SECONDS=15`).
- **Processing Architecture**:
  1. **Immediate Sensor Validation**:
     - Strict physical boundary checks:
       - **Temperature**: `-40°C` to `70°C`
       - **Humidity**: `0%` to `100%`
       - **Gross Weight**: `0 kg` to `300 kg`
       - **Battery Level**: `0%` to `100%`
     - Validates against `NaN`, `Infinity`, `null`, `undefined`, and non-numeric values.
     - **No Silent Clamping**: Impossible or out-of-bounds readings (e.g. 100°C) are never silently clamped into valid ranges; they are flagged as abnormal sensor anomalies.
  2. **Real-Time SMS & Anomaly Dispatch**:
     - When an abnormal reading or sensor fault is detected, the backend immediately dispatches an urgent SMS via **Twilio** to the beekeeper/operator.
     - Message template:
       ```text
       🚨 HONEYCHAIN CRITICAL SENSOR ALERT
       Hive: {hiveId} | Device: {deviceId}
       Issue: {metric} reading of {value}{unit} is outside physical limits ({min} to {max}).
       Time: {IST timestamp}
       Please inspect sensor hardware or colony immediately.
       ```
     - **SMS Cooldown Deduplication**: An in-memory cooldown cache (`TWILIO_SMS_COOLDOWN_SECONDS`, default: 1800s / 30 min) prevents alert fatigue and duplicate SMS storms from faulty sensors.
     - Creates an entry in the `Alert` collection with `severity: "critical"` and returns `400 Bad Request`.
  3. **Downsampled In-Memory Persistence**:
     - Incoming high-frequency readings are processed immediately in memory for real-time monitoring and biological health warnings.
     - To prevent unbounded database growth, readings are persisted to the MongoDB `SensorReading` collection **only once every 10 minutes** per device (`TELEMETRY_PERSIST_INTERVAL_SECONDS=600`).
     - Sub-10-minute intermediate readings update the `Hive` document (`lastPingAt`, `batteryLevelPct`, `latestReadingAt`) and run biological threshold alerts without creating duplicate `SensorReading` documents, returning `200 OK` (`persisted: false`).
     - 10-minute interval readings persist to MongoDB and return `201 Created` (`persisted: true`).
  4. **Clock Drift Protection**:
     - Rejects timestamps drifting more than 10 minutes into the future.
  5. **Idempotency**:
     - Prevents duplicate insertions on network retries matching on `deviceId` + `timestamp`.

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

#### Example Response (`201 Created` - 10-Minute Persisted Sample)
```json
{
  "success": true,
  "duplicate": false,
  "persisted": true,
  "message": "Telemetry reading ingested and persisted successfully",
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

#### Example Response (`200 OK` - Sub-10-Minute In-Memory Processed)
```json
{
  "success": true,
  "duplicate": false,
  "persisted": false,
  "message": "Telemetry reading processed in real-time (persistence throttled to 10m interval)",
  "data": {
    "hiveId": "HIVE-001",
    "deviceId": "ESP32-GATEWAY-001",
    "timestamp": "2026-09-08T10:30:15.000Z",
    "temperature": 35.2,
    "humidity": 62.5,
    "weightKg": 42.8,
    "batteryLevelPct": 94
  }
}
```

#### Example Response (`400 Bad Request` - Abnormal Sensor Value & Twilio SMS Dispatched)
```json
{
  "success": false,
  "error": {
    "message": "Abnormal telemetry reading detected: Temperature reading (100°C) is outside physically possible range (-40°C to 70°C). Alert generated and SMS dispatched."
  }
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

## 9. Apiary & Hive Management Endpoints (`/api/apiaries`, `/api/hives`, `/hives`)

### 9.1 Create Apiary
- **Route**: `POST /api/apiaries`
- **Access**: `beekeeper`, `admin`
- **Description**: Registers a new apiary sanctuary with GeoJSON coordinates. Binds to the user's organization for multi-tenant isolation.
- **Request Body**:
  - `name` (string, required): Name of apiary.
  - `location` (object, required): `{ latitude: number, longitude: number, region: string, address?: string }`.
  - `floraType` (string[], optional): Dominant flora (e.g. `["Mangrove", "Mustard"]`).
  - `capacity` (number, optional): Maximum hive capacity (default: 20).
- **Response**: `201 Created` with created apiary data.

### 9.2 List Apiaries
- **Route**: `GET /api/apiaries`
- **Access**: Authenticated
- **Description**: Returns tenant-isolated list of apiaries (or all for admin/auditor). Supports `page`, `limit`, `region` query filters.
- **Response**: `200 OK` with paginated apiaries.

### 9.3 Get Apiary Details
- **Route**: `GET /api/apiaries/:id`
- **Access**: Authenticated (tenant-scoped)
- **Description**: Returns apiary profile with child hives populated.

### 9.4 Update Apiary
- **Route**: `PATCH /api/apiaries/:id`
- **Access**: `beekeeper`, `admin`
- **Description**: Updates apiary name, capacity, floraType, or notes.

### 9.5 Hive Management (`/api/hives` & `/hives`)
- **Route**: `POST /api/hives`
  - **Access**: `beekeeper`, `admin`
  - **Description**: Registers a new hive linked to an apiary. Inherits beekeeper and organization, initializes health summary.
- **Route**: `GET /api/hives` (Alias: `GET /hives`)
  - **Access**: Authenticated
  - **Description**: Lists hives with filters (`apiaryId`, `status`, `healthStatus`, `search`) and populated parent apiary.
- **Route**: `GET /api/hives/:hiveId` (Alias: `GET /hives/:hiveId`)
  - **Access**: Authenticated
  - **Description**: Returns hive details with populated apiary.
- **Route**: `PATCH /api/hives/:hiveId`
  - **Access**: `beekeeper`, `admin`
  - **Description**: Updates hive status, queen details, hardware metadata, and notes.
- **Route**: `DELETE /api/hives/:hiveId`
  - **Access**: `beekeeper`, `admin`
  - **Description**: Deletes hive and unlinks from parent apiary.

---

## 10. Extended Batch Operations (`/api/batches`)

### 10.1 List Batches (Paginated & Filtered)
- **Route**: `GET /api/batches`
- **Access**: Authenticated
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `status` (`Registered` | `Certified` | `InTransit` | `Delivered` | `Recalled`)
  - `search` (string: matches batchId or floralOrigin)
  - `organizationId` (string: admin/auditor filter)
- **Response**: `200 OK` with `{ success: true, data: Batch[], pagination: { total, page, limit, totalPages } }`.

### 10.2 Inspect Batch Details
- **Route**: `GET /api/batches/:batchId`
- **Access**: Authenticated
- **Description**: Retrieves full batch document including quality analysis, custody history, blockchain metadata, and populated apiary/hives.

### 10.3 Laboratory Certificate PDF Upload
- **Route**: `POST /api/batches/:batchId/certificate`
- **Access**: `lab`, `admin`
- **Description**: Uploads lab certificate PDF assay. Validates `%PDF-` magic bytes, calculates SHA-256 hash, stores file (Cloudinary or local static storage), and updates `batch.quality.labReportUrl` and `batch.quality.labReportHash`.
- **Request Body (JSON)**:
  - `fileName` (string, required): e.g. `purity_assay.pdf`
  - `fileData` (string, required): Base64-encoded PDF content.
- **Response**: `201 Created` with `{ success: true, labReportHash, labReportUrl, sizeBytes }`.

### 10.4 Deliver Batch
- **Route**: `POST /api/batches/:batchId/deliver`
- **Access**: `distributor`, `processor`, `beekeeper`, `admin`, `transporter`
- **Description**: Executes final custody delivery on Ethereum Sepolia, transitions status to `Delivered`, and appends custody record with delivery location.
- **Request Body**:
  - `to` (string, optional): Recipient Ethereum address.
  - `location` (string, optional): Delivery destination (default: `Retail Distribution Center`).
- **Response**: `200 OK` with updated batch and blockchain transaction receipt.

---

## 11. Harvest Workflow (`/api/harvests`, `/harvests`)

### 11.1 Create Harvest
- **Route**: `POST /api/harvests` (Alias: `POST /harvests`)
- **Access**: `beekeeper`, `admin`
- **Description**: Records raw honey extraction from a registered hive.
- **Request Body**:
  - `hiveId` (string, required)
  - `quantityGrams` (number, required)
  - `harvestTimestamp` (number, optional)
  - `floralOrigin` (string, optional)
  - `batchId` (string, optional)
  - `notes` (string, optional)
- **Response**: `201 Created` with created harvest record.

### 11.2 List Harvests
- **Route**: `GET /api/harvests` (Alias: `GET /harvests`)
- **Access**: Authenticated (tenant-scoped)
- **Description**: Returns paginated harvests with filters for `hiveId`, `batchId`, `floralOrigin`.

### 11.3 Get Harvest Details
- **Route**: `GET /api/harvests/:harvestId` (Alias: `GET /harvests/:harvestId`)
- **Access**: Authenticated

---

## 12. Alert System & IoT Diagnostics

### 12.1 List Alerts
- **Route**: `GET /api/alerts`
- **Access**: Authenticated
- **Description**: Queries active and historical alerts for the user's organization. Supports filters: `severity`, `alertType`, `hiveId`, `isResolved`.

### 12.2 Resolve Alert
- **Route**: `PATCH /api/alerts/:id/resolve`
- **Access**: Authenticated
- **Description**: Marks alert as resolved and records resolver user ID and resolution timestamp.

### 12.3 Hive Telemetry History
- **Route**: `GET /api/iot/telemetry/:hiveId`
- **Access**: Authenticated
- **Query Parameters**:
  - `resolution`: `raw` (default) or `hourly` (averages metrics by hour).
  - `limit`: default 50, max 500.

### 12.4 Device Status & Diagnostics
- **Route**: `GET /api/iot/devices/:deviceId/status`
- **Access**: Authenticated
- **Description**: Returns hardware connectivity status (`online` / `offline`), battery percentage, last ping timestamp, and latest sensor metrics.

---

## 13. Dashboard & Regional Cluster Analytics (`/api/analytics`)

### 13.1 Role-Based Dashboard Metrics
- **Route**: `GET /api/analytics/dashboard`
- **Access**: Authenticated
- **Description**: Returns real-time MongoDB aggregated statistics customized for the requesting user's role:
  - Hives (total, active, inactive, healthy, average health score)
  - Alerts (active, critical, warning, info)
  - Batches (total, created, in transit, delivered, recalled, tested, total quantity)
  - Harvests (total extractions, total grams, total kg)
  - Telemetry (total readings, 24-hour activity)
  - AI predictions (total predictions, anomalies detected, high stress count)
  - Organizations (total count for admin/auditor)

### 13.2 Regional Apiary Clusters
- **Route**: `GET /api/analytics/clusters`
- **Access**: Authenticated
- **Description**: Aggregates apiaries by region, calculating geographic centroid coordinates (`avgLatitude`, `avgLongitude`), total hives covered, and unique farmers count.

---

## 14. Development & Rule Enforcement

> [!IMPORTANT]
> **To all developers and AI coding agents:**  
> If you create a new route in `backend/src/routes/` or modify parameters/responses in `backend/src/controllers/`, you **MUST update this document (`docs/api.md`)** before pushing or opening a PR. Keep table summaries, schema types, query parameters, and JSON payloads in sync!

