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







