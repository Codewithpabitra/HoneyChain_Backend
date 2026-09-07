# Architecture Decision Records (ADR)

## ADR-001: Polygon Amoy Replaces Hyperledger Fabric for Prototype

### Status
**Superseded by ADR-006** (Phase 3)
*(Note: Hyperledger Fabric was abandoned in Phase 0 in favor of a public EVM testnet. Prior to contract deployment in Phase 3, the target EVM testnet was updated from Polygon Amoy to Ethereum Sepolia via ADR-006).*

### Context
In earlier architectural explorations, Hyperledger Fabric was considered for HoneyChain's traceability ledger due to its enterprise reputation and native permissioned architecture. However, deploying and maintaining Hyperledger Fabric introduces massive operational complexity, requiring multiple Docker containers for Orderer nodes, Peer nodes, Fabric CA, Raft consensus mechanism, LevelDB/CouchDB state databases, channels, and chaincode lifecycle packages. 

For the Smart India Hackathon 2026 prototype, our backend runs on a lightweight VPS and cloud infrastructure. Furthermore, the core product requirement is **consumer trust through public verifiability**: when a consumer scans a QR code on a jar of honey in a supermarket, they should not be forced to trust a closed, private consortium ledger that only the system operator can read.

### Decision
We have completely **abandoned Hyperledger Fabric** and selected **Polygon Amoy Testnet** (Chain ID: `80002`, Gas token: `POL`) as the blockchain provenance layer for HoneyChain.

### Rationale
1. **Zero VPS Infrastructure Overhead**: Polygon is a public network. The HoneyChain VPS does not run a blockchain node, peer, or orderer. The backend communicates directly via JSON-RPC with hosted RPC providers (e.g., Polygon official RPC, Alchemy, or Infura).
2. **True Public Verifiability**: Any consumer, retailer, auditor, or hackathon evaluator can independently inspect batch registrations, quality certifications, and custody transfers on [Polygonscan Amoy](https://amoy.polygonscan.com/) without needing proprietary credentials or VPN access to a private network.
3. **EVM Compatibility & Standard Tooling**: Writing smart contracts in Solidity and compiling/testing with Hardhat allows seamless unit testing, automated verification, and rapid development cycles. Interfacing via `ethers.js` v6 provides standard, well-documented integration with Node.js.
4. **Economic Feasibility**: Development on the Amoy testnet is free using faucet POL tokens. Transitioning to production Polygon PoS mainnet ensures sub-cent transaction costs, making high-volume agricultural batch tracking economically viable.
5. **Decentralized Trust without Full Permissiveness**: By embedding Role-Based Access Control (RBAC) directly inside the Solidity smart contract (`HoneyChainRegistry.sol`), we achieve permissioned write semantics (only vetted beekeepers, certified labs, and processors can update state) combined with open read accessibility for consumers.

### Consequences
- **Positive**:
  - Eliminated Fabric Docker infrastructure, saving several gigabytes of VPS RAM and disk storage.
  - Development velocity increased significantly using Hardhat, TypeScript, and ethers.js.
  - Proof of provenance is verifiable on public block explorers.
- **Mitigations**:
  - *Public Visibility*: Raw IoT sensor telemetry, beekeeper personal details, and internal lab documents are stored off-chain in MongoDB; only irreversible SHA-256 cryptographic hashes and essential provenance flags exist on-chain.
  - *Gas Management*: Server-side wallets require testnet POL from faucets for transactions. Faucets and automated balance monitoring are documented in setup guides.

---

## ADR-002: Strict Separation of Operational Storage (MongoDB) and Provenance Ledger (Polygon)

### Status
**Accepted** (Phase 0)

### Context
IoT hive nodes continuously stream environmental metrics (temperature, humidity, colony acoustics, hive weight) at frequent intervals. Writing every telemetry packet or full laboratory chemical profile directly to a blockchain would result in severe network bloat and unnecessary costs.

### Decision
- **MongoDB** is our primary operational database. It stores sensor time-series data, hive operational statuses, user accounts, and full-text batch metadata.
- **Polygon Amoy** stores only cryptographic commitments (SHA-256 batch hashes, lab report hashes, quality certifications, and custody handoff signatures).

---

## ADR-003: Event-Driven History Reconstruction over Dynamic On-Chain Arrays

### Status
**Accepted** (Phase 0)

### Context
Traceability requires viewing the full chronological journey of a honey batch across its lifecycle (Harvest -> Inspection -> Processing -> Packaging -> Distribution). Storing dynamic arrays of historical states inside Solidity contract storage is an anti-pattern that drastically increases gas consumption on every write.

### Decision
The smart contract will emit indexed events (`BatchRegistered`, `BatchCertified`, `CustodyTransferred`, `BatchRecalled`) on state transitions. The backend `ethers.js` client reconstructs the historical timeline by filtering event logs from Polygon RPC via contract topic filters.

---

## ADR-004: On-Chain Batch Data Model and Safe Numeric Representation Standards

### Status
**Accepted** (Phase 1)

### Context
Solidity does not support floating-point arithmetic. Storing physical quantities (e.g. 24.5 kg of honey) or chemical quality metrics (e.g. 18.25% moisture content) requires fixed-precision or unit-scaled integer conversions. Furthermore, on-chain state must be packed compactly into 32-byte EVM storage slots to minimize transaction gas overhead.

### Decision
1. **Quantity Scaling**: Harvest batch quantity is stored as `uint64 quantityGrams` in integer grams.
   - Example: A harvest of `24.5 kg` is represented on-chain as `24500` grams.
   - Fits safely in `uint64` with up to 18 quintillion grams without precision loss.
2. **Moisture Representation**: Stored as `uint16 moistureBasisPoints` (where 100 basis points = 1.00%).
   - Example: `18.25%` moisture is represented as `1825` basis points.
   - Standard food regulatory limits (Codex Alimentarius / FSSAI: max 20.00% moisture = 2000 bps) are easily enforced via straightforward integer comparisons (`moistureBasisPoints <= 2000`).
3. **Quality Classification**: Stored as an explicit `uint8` enum (`QualityGrade { None, GradeA, GradeB, GradeC, Substandard }`).
4. **Timestamps**: Stored as `uint64` unix epoch seconds.
5. **EVM Slot Packing**: Struct members are ordered to pack cleanly into contiguous 32-byte words:
   - Slot 1: `bytes32 metadataHash`
   - Slot 2: `bytes32 labReportHash`
   - Slot 3: `address producer` (20 bytes) + `uint64 harvestTimestamp` (8 bytes) + 4 bytes padding
   - Slot 4: `address certifier` (20 bytes) + `uint64 certificationTimestamp` (8 bytes) + 4 bytes padding
   - Slot 5: `address currentCustodian` (20 bytes) + `uint64 quantityGrams` (8 bytes) + `uint16 moistureBasisPoints` (2 bytes) + `uint8 status` (1 byte) + `uint8 qualityGrade` (1 byte) = 32 bytes exactly.

---

## ADR-005: Role-Based Authorization & Custody Enforcement

### Status
**Accepted** (Phase 1)

### Context
Honey traceability spans distinct physical actors: beekeepers harvest honey, independent labs verify purity, processors extract and bottle honey, and distributors transport goods. The smart contract must ensure that unauthorized actors cannot forge batches or falsify certifications.

### Decision
1. **Separation of Dedicated Roles**:
   - `BEEKEEPER_ROLE`: Can register batches and initiate custody transfer.
   - `LABORATORY_ROLE`: Can certify batches and record quality assays.
   - `PROCESSOR_ROLE`: Can receive custody and transfer to distribution.
   - `DISTRIBUTOR_ROLE`: Can receive custody and deliver to retail.
   - `DEFAULT_ADMIN_ROLE`: Administers role assignments and executes emergency recalls.
   - `AUDITOR_ROLE`: Dedicated inspection role.
2. **Custody Lock**: Only the `currentCustodian` of a batch is permitted to transfer custody to another authorized entity.
3. **Terminal Recalled State**: Once a batch is recalled by an Admin, Producer, Lab, or Auditor, the batch enters a terminal `Recalled` state and cannot undergo further custody transfers or certifications.

---

## ADR-006: Ethereum Sepolia Selected as Primary Testnet Prior to Deployment

### Status
**Accepted** (Phase 3)

### Context
In Phase 0, Polygon Amoy was initially considered as the public testnet deployment target. However, prior to executing any on-chain deployment, the testing infrastructure and testnet requirements were re-evaluated:
1. Polygon's public Amoy RPC (`rpc-amoy.polygon.technology`) was deprecated in July 2026, leading to RPC fragmentation.
2. HoneyChain's smart contract (`HoneyChainRegistry.sol`) uses standard EVM Solidity and OpenZeppelin contracts without any Polygon-specific or L2-specific opcodes or mechanisms.
3. **Ethereum Sepolia** is the official, recommended, and most widely supported proof-of-stake testnet for Ethereum application development.
4. Sepolia features broad faucet infrastructure (Google Cloud Faucet, Alchemy Faucet, PoW Faucet, Infura Faucet), universal developer tooling support, and rock-solid block explorer capabilities via Sepolia Etherscan.

### Decision
We intentionally transitioned the HoneyChain blockchain deployment target from **Polygon Amoy to Ethereum Sepolia** before any contract deployment occurred.
- **Target Network**: Ethereum Sepolia
- **Chain ID**: `11155111`
- **Native Gas Token**: `Sepolia ETH`
- **Primary Block Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)
- **Target Deployment Artifact Path**: `blockchain/deployments/sepolia/HoneyChainRegistry.json`

### Consequences
- **Positive**:
  - Broadest possible developer and faucet availability.
  - Zero lock-in to L2-specific infrastructure.
  - Public contract source code and transactions are fully auditable on Sepolia Etherscan.
  - The smart contract implementation, role model, and test suite remain 100% identical.
- **Zero Impact on Production Readiness**:
  - The contract adheres strictly to EVM standards. If mainnet deployment on Polygon PoS, Arbitrum, or Ethereum L1 is desired in the future, the identical bytecode can be deployed by changing only the RPC URL and chain ID.


