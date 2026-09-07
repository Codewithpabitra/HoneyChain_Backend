# HoneyChain Changelog

All notable changes to the HoneyChain backend and blockchain subsystems will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

