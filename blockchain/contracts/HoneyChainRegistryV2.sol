// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title HoneyChainRegistryV2
 * @notice Production-grade supply chain provenance, quality certification, two-step custody handoff,
 * and auditor review governance registry for HoneyChain on Ethereum Sepolia.
 *
 * Strict Supply Chain Sequence:
 *   BEEKEEPER (register batch)
 *     -> proposeCustodyTransfer -> LABORATORY (accept custody)
 *     -> certify batch
 *     -> proposeCustodyTransfer -> PROCESSOR (accept custody)
 *     -> [processing / packaging / consumer QR]
 *     -> proposeCustodyTransfer -> DISTRIBUTOR (accept custody)
 *     -> deliverBatch -> DELIVERED
 *
 * Stakeholder Governance:
 *   Normal stakeholders cannot directly recall or reject batches.
 *   Stakeholders submit `requestAuditorReview(batchId, reason)`.
 *   Only AUDITOR_ROLE (or DEFAULT_ADMIN_ROLE) can decide via `clearAuditorReview` or `rejectBatch` (Recalled).
 */
contract HoneyChainRegistryV2 is AccessControl {
    // ── Role Definitions ──────────────────────────────────────────────────────────
    bytes32 public constant BEEKEEPER_ROLE = keccak256("BEEKEEPER_ROLE");
    bytes32 public constant LABORATORY_ROLE = keccak256("LABORATORY_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ── Enums ─────────────────────────────────────────────────────────────────────
    enum BatchStatus {
        Registered,   // 0: Harvest registered by beekeeper
        Certified,    // 1: Tested and certified by laboratory
        InTransit,    // 2: In custody of processor or distributor
        Delivered,    // 3: Delivered to final retail/distribution destination
        Recalled      // 4: Rejected or recalled by auditor (terminal)
    }

    enum QualityGrade {
        None,         // 0: Uncertified
        GradeA,       // 1: Premium purity (Moisture <= 18.00%)
        GradeB,       // 2: Standard commercial table grade (Moisture <= 20.00%)
        GradeC,       // 3: Industrial / baking grade
        Substandard   // 4: Failed purity or adulteration tests
    }

    // ── Structs ───────────────────────────────────────────────────────────────────
    struct HoneyBatch {
        bytes32 metadataHash;            // SHA-256 digest of harvest metadata
        bytes32 labReportHash;           // SHA-256 digest of lab assay certificate
        address producer;                // Beekeeper wallet that harvested the batch
        address laboratory;              // Laboratory that tested & certified the batch
        address processor;               // Processor that packaged the batch
        address distributor;             // Distributor that delivered the batch
        address currentCustodian;        // Current wallet holding confirmed custody
        uint64 quantityGrams;            // Harvest quantity in grams
        uint64 harvestTimestamp;         // Unix timestamp of harvest
        uint64 certificationTimestamp;   // Unix timestamp of laboratory certification
        uint16 moistureBasisPoints;      // Moisture % in basis points (1825 = 18.25%)
        BatchStatus status;              // Current batch lifecycle status
        QualityGrade qualityGrade;       // Laboratory quality grade
    }

    struct PendingTransfer {
        address recipient;               // Proposed custodian wallet
        string location;                 // Transfer location description
        uint64 proposedAt;               // Timestamp when transfer was proposed
        bool exists;                     // True if transfer is currently pending acceptance
    }

    struct AuditorReviewRequest {
        uint256 requestId;               // Unique incremental review request ID
        bytes32 batchId;                 // Associated batch ID
        address requester;               // Stakeholder who requested the review
        string reason;                   // Explanation / concern for auditor
        uint64 timestamp;                // When the review was requested
        bool active;                     // True while awaiting auditor decision
        bool resolved;                   // True once decided
        address decidedBy;               // Auditor or admin wallet that decided
        uint64 decidedAt;                // Timestamp of decision
        string resolutionNote;           // Notes recorded by auditor
    }

    // ── State Variables ───────────────────────────────────────────────────────────
    mapping(bytes32 => HoneyBatch) private _batches;
    mapping(bytes32 => PendingTransfer) private _pendingTransfers;
    mapping(bytes32 => uint256) private _activeReviewRequestId; // 0 if none active
    mapping(uint256 => AuditorReviewRequest) private _reviewRequests;
    uint256 private _reviewRequestCounter;

    // ── Events ────────────────────────────────────────────────────────────────────
    event BatchRegistered(
        bytes32 indexed batchId,
        address indexed beekeeper,
        uint64 quantityGrams,
        bytes32 metadataHash,
        uint64 harvestTimestamp
    );

    event CustodyTransferProposed(
        bytes32 indexed batchId,
        address indexed from,
        address indexed to,
        string location,
        uint64 timestamp
    );

    event CustodyTransferAccepted(
        bytes32 indexed batchId,
        address indexed from,
        address indexed to,
        string location,
        uint64 timestamp
    );

    event BatchCertified(
        bytes32 indexed batchId,
        address indexed laboratory,
        bytes32 labReportHash,
        QualityGrade qualityGrade,
        uint16 moistureBasisPoints,
        uint64 certificationTimestamp
    );

    event BatchDelivered(
        bytes32 indexed batchId,
        address indexed distributor,
        string location,
        uint64 timestamp
    );

    event AuditorReviewRequested(
        bytes32 indexed batchId,
        uint256 indexed requestId,
        address indexed requester,
        string reason,
        uint64 timestamp
    );

    event AuditorReviewCleared(
        bytes32 indexed batchId,
        uint256 indexed requestId,
        address indexed auditor,
        string note,
        uint64 timestamp
    );

    event BatchRecalled(
        bytes32 indexed batchId,
        address indexed by,
        string reason,
        uint64 timestamp
    );

    // ── Custom Errors ─────────────────────────────────────────────────────────────
    error BatchAlreadyExists(bytes32 batchId);
    error BatchDoesNotExist(bytes32 batchId);
    error BatchAlreadyRecalled(bytes32 batchId);
    error BatchAlreadyDelivered(bytes32 batchId);
    error BatchAlreadyCertified(bytes32 batchId);
    error InvalidBatchId();
    error InvalidQuantity();
    error InvalidMetadataHash();
    error InvalidLabReportHash();
    error InvalidQualityGrade();
    error InvalidRecipient();
    error NotCurrentCustodian(address caller, address currentCustodian);
    error UnauthorizedAction(address caller);
    error InvalidLifecycleTransition(BatchStatus currentStatus, address recipient);
    error NoPendingTransfer();
    error PendingTransferAlreadyExists();
    error CallerNotProposedRecipient(address caller, address expectedRecipient);
    error ActiveReviewRequestExists(uint256 existingRequestId);
    error NoActiveReviewRequest();
    error ReviewRequestNotFound(uint256 requestId);
    error EmptyReason();

    // ── Constructor ───────────────────────────────────────────────────────────────
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidRecipient();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    // ── 1. Batch Registration (Beekeeper) ─────────────────────────────────────────
    /**
     * @notice Registers a new honey harvest batch.
     * @dev Only accounts with BEEKEEPER_ROLE can register batches. Sets initial custodian to producer.
     */
    function registerBatch(
        bytes32 batchId,
        uint64 quantityGrams,
        bytes32 metadataHash,
        uint64 harvestTimestamp
    ) external onlyRole(BEEKEEPER_ROLE) returns (bool) {
        if (batchId == bytes32(0)) revert InvalidBatchId();
        if (quantityGrams == 0) revert InvalidQuantity();
        if (metadataHash == bytes32(0)) revert InvalidMetadataHash();
        if (_batches[batchId].producer != address(0)) revert BatchAlreadyExists(batchId);

        uint64 actualTimestamp = harvestTimestamp == 0
            ? uint64(block.timestamp)
            : harvestTimestamp;

        HoneyBatch storage batch = _batches[batchId];
        batch.metadataHash = metadataHash;
        batch.producer = msg.sender;
        batch.currentCustodian = msg.sender;
        batch.quantityGrams = quantityGrams;
        batch.harvestTimestamp = actualTimestamp;
        batch.status = BatchStatus.Registered;
        batch.qualityGrade = QualityGrade.None;

        emit BatchRegistered(
            batchId,
            msg.sender,
            quantityGrams,
            metadataHash,
            actualTimestamp
        );

        return true;
    }

    // ── 2. Two-Step Custody Handshake ─────────────────────────────────────────────
    /**
     * @notice Current custodian proposes a custody transfer to a specific recipient address.
     * @dev Enforces strict supply-chain transitions:
     *   - Registered -> LABORATORY_ROLE
     *   - Certified -> PROCESSOR_ROLE
     *   - Processor -> DISTRIBUTOR_ROLE
     *   - Distributor -> DISTRIBUTOR_ROLE
     */
    function proposeCustodyTransfer(
        bytes32 batchId,
        address recipient,
        string calldata location
    ) external returns (bool) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (batch.status == BatchStatus.Delivered) revert BatchAlreadyDelivered(batchId);
        if (msg.sender != batch.currentCustodian) {
            revert NotCurrentCustodian(msg.sender, batch.currentCustodian);
        }
        if (recipient == address(0) || recipient == msg.sender) revert InvalidRecipient();
        if (_pendingTransfers[batchId].exists) revert PendingTransferAlreadyExists();

        // Enforce valid lifecycle transitions without arbitrary jumping
        if (batch.status == BatchStatus.Registered) {
            if (!hasRole(LABORATORY_ROLE, recipient)) {
                revert InvalidLifecycleTransition(batch.status, recipient);
            }
        } else if (batch.status == BatchStatus.Certified) {
            // Once certified, laboratory hands off to processor
            if (!hasRole(PROCESSOR_ROLE, recipient)) {
                revert InvalidLifecycleTransition(batch.status, recipient);
            }
        } else if (batch.status == BatchStatus.InTransit) {
            // Processor hands off to distributor, or distributor transfers to another distributor
            if (msg.sender == batch.processor) {
                if (!hasRole(DISTRIBUTOR_ROLE, recipient)) {
                    revert InvalidLifecycleTransition(batch.status, recipient);
                }
            } else if (msg.sender == batch.distributor) {
                if (!hasRole(DISTRIBUTOR_ROLE, recipient)) {
                    revert InvalidLifecycleTransition(batch.status, recipient);
                }
            } else {
                revert UnauthorizedAction(msg.sender);
            }
        } else {
            revert InvalidLifecycleTransition(batch.status, recipient);
        }

        _pendingTransfers[batchId] = PendingTransfer({
            recipient: recipient,
            location: location,
            proposedAt: uint64(block.timestamp),
            exists: true
        });

        emit CustodyTransferProposed(
            batchId,
            msg.sender,
            recipient,
            location,
            uint64(block.timestamp)
        );

        return true;
    }

    /**
     * @notice Proposed recipient accepts custody, making them the active custodian.
     */
    function acceptCustody(bytes32 batchId) external returns (bool) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (batch.status == BatchStatus.Delivered) revert BatchAlreadyDelivered(batchId);

        PendingTransfer memory pending = _pendingTransfers[batchId];
        if (!pending.exists) revert NoPendingTransfer();
        if (msg.sender != pending.recipient) {
            revert CallerNotProposedRecipient(msg.sender, pending.recipient);
        }

        address previousCustodian = batch.currentCustodian;
        batch.currentCustodian = msg.sender;

        // Record respective stakeholder identity and advance status
        if (hasRole(LABORATORY_ROLE, msg.sender)) {
            batch.laboratory = msg.sender;
        } else if (hasRole(PROCESSOR_ROLE, msg.sender)) {
            batch.processor = msg.sender;
            batch.status = BatchStatus.InTransit;
        } else if (hasRole(DISTRIBUTOR_ROLE, msg.sender)) {
            batch.distributor = msg.sender;
            batch.status = BatchStatus.InTransit;
        }

        delete _pendingTransfers[batchId];

        emit CustodyTransferAccepted(
            batchId,
            previousCustodian,
            msg.sender,
            pending.location,
            uint64(block.timestamp)
        );

        return true;
    }

    // ── 3. Laboratory Quality Certification ────────────────────────────────────────
    /**
     * @notice Certifies batch quality with laboratory assay results.
     * @dev Only LABORATORY_ROLE can certify. Must be the associated laboratory holding custody.
     */
    function certifyBatch(
        bytes32 batchId,
        bytes32 labReportHash,
        QualityGrade qualityGrade,
        uint16 moistureBasisPoints
    ) external onlyRole(LABORATORY_ROLE) returns (bool) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (batch.certificationTimestamp != 0) revert BatchAlreadyCertified(batchId);
        if (labReportHash == bytes32(0)) revert InvalidLabReportHash();
        if (qualityGrade == QualityGrade.None) revert InvalidQualityGrade();

        // Laboratory must hold custody or be the associated laboratory
        if (batch.currentCustodian != msg.sender && batch.laboratory != msg.sender) {
            revert NotCurrentCustodian(msg.sender, batch.currentCustodian);
        }

        uint64 certTimestamp = uint64(block.timestamp);
        batch.laboratory = msg.sender;
        batch.labReportHash = labReportHash;
        batch.qualityGrade = qualityGrade;
        batch.moistureBasisPoints = moistureBasisPoints;
        batch.certificationTimestamp = certTimestamp;
        batch.status = BatchStatus.Certified;

        emit BatchCertified(
            batchId,
            msg.sender,
            labReportHash,
            qualityGrade,
            moistureBasisPoints,
            certTimestamp
        );

        return true;
    }

    // ── 4. Batch Delivery (Distributor) ───────────────────────────────────────────
    /**
     * @notice Confirms final delivery of the batch to retail or end consumer.
     * @dev Only current custodian with DISTRIBUTOR_ROLE or DEFAULT_ADMIN_ROLE can mark delivered.
     */
    function deliverBatch(
        bytes32 batchId,
        string calldata deliveryLocation
    ) external returns (bool) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (batch.status == BatchStatus.Delivered) revert BatchAlreadyDelivered(batchId);
        if (msg.sender != batch.currentCustodian && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotCurrentCustodian(msg.sender, batch.currentCustodian);
        }
        if (!hasRole(DISTRIBUTOR_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAction(msg.sender);
        }

        batch.status = BatchStatus.Delivered;

        // Clear any pending transfer if active
        if (_pendingTransfers[batchId].exists) {
            delete _pendingTransfers[batchId];
        }

        emit BatchDelivered(
            batchId,
            msg.sender,
            deliveryLocation,
            uint64(block.timestamp)
        );

        return true;
    }

    // ── 5. Auditor Governance & Review Requests ────────────────────────────────────
    /**
     * @notice Supply chain stakeholders request an auditor review for a batch.
     * @dev Standard stakeholders cannot directly recall/reject. Only 1 active review request per batch.
     */
    function requestAuditorReview(
        bytes32 batchId,
        string calldata reason
    ) external returns (uint256) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (bytes(reason).length == 0) revert EmptyReason();

        bool isAuthorizedStakeholder = hasRole(BEEKEEPER_ROLE, msg.sender) ||
            hasRole(LABORATORY_ROLE, msg.sender) ||
            hasRole(PROCESSOR_ROLE, msg.sender) ||
            hasRole(DISTRIBUTOR_ROLE, msg.sender) ||
            hasRole(AUDITOR_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (!isAuthorizedStakeholder) revert UnauthorizedAction(msg.sender);

        uint256 currentActiveId = _activeReviewRequestId[batchId];
        if (currentActiveId != 0 && _reviewRequests[currentActiveId].active) {
            revert ActiveReviewRequestExists(currentActiveId);
        }

        _reviewRequestCounter++;
        uint256 requestId = _reviewRequestCounter;

        _reviewRequests[requestId] = AuditorReviewRequest({
            requestId: requestId,
            batchId: batchId,
            requester: msg.sender,
            reason: reason,
            timestamp: uint64(block.timestamp),
            active: true,
            resolved: false,
            decidedBy: address(0),
            decidedAt: 0,
            resolutionNote: ""
        });

        _activeReviewRequestId[batchId] = requestId;

        emit AuditorReviewRequested(
            batchId,
            requestId,
            msg.sender,
            reason,
            uint64(block.timestamp)
        );

        return requestId;
    }

    /**
     * @notice Auditor or Admin clears an active review request, allowing batch to proceed.
     */
    function clearAuditorReview(
        bytes32 batchId,
        uint256 requestId,
        string calldata resolutionNote
    ) external returns (bool) {
        if (!hasRole(AUDITOR_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAction(msg.sender);
        }

        AuditorReviewRequest storage req = _reviewRequests[requestId];
        if (req.batchId != batchId || !req.active) revert NoActiveReviewRequest();

        req.active = false;
        req.resolved = true;
        req.decidedBy = msg.sender;
        req.decidedAt = uint64(block.timestamp);
        req.resolutionNote = resolutionNote;

        if (_activeReviewRequestId[batchId] == requestId) {
            _activeReviewRequestId[batchId] = 0;
        }

        emit AuditorReviewCleared(
            batchId,
            requestId,
            msg.sender,
            resolutionNote,
            uint64(block.timestamp)
        );

        return true;
    }

    /**
     * @notice Auditor or Admin formally rejects and recalls a batch (terminal).
     */
    function rejectBatch(
        bytes32 batchId,
        uint256 requestId,
        string calldata reason
    ) external returns (bool) {
        if (!hasRole(AUDITOR_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAction(msg.sender);
        }

        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (bytes(reason).length == 0) revert EmptyReason();

        if (requestId != 0) {
            AuditorReviewRequest storage req = _reviewRequests[requestId];
            if (req.batchId == batchId && req.active) {
                req.active = false;
                req.resolved = true;
                req.decidedBy = msg.sender;
                req.decidedAt = uint64(block.timestamp);
                req.resolutionNote = reason;
            }
        }

        if (_activeReviewRequestId[batchId] == requestId) {
            _activeReviewRequestId[batchId] = 0;
        }

        // Cancel any pending transfer
        if (_pendingTransfers[batchId].exists) {
            delete _pendingTransfers[batchId];
        }

        batch.status = BatchStatus.Recalled;

        emit BatchRecalled(
            batchId,
            msg.sender,
            reason,
            uint64(block.timestamp)
        );

        return true;
    }

    // ── 6. Public View Functions (Zero-Wallet Consumer Verification) ──────────────
    /**
     * @notice Retrieves batch details.
     */
    function getBatch(bytes32 batchId) external view returns (HoneyBatch memory) {
        HoneyBatch memory batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        return batch;
    }

    /**
     * @notice Retrieves pending custody transfer details for a batch.
     */
    function getPendingTransfer(bytes32 batchId) external view returns (PendingTransfer memory) {
        return _pendingTransfers[batchId];
    }

    /**
     * @notice Retrieves review request by ID.
     */
    function getReviewRequest(uint256 requestId) external view returns (AuditorReviewRequest memory) {
        AuditorReviewRequest memory req = _reviewRequests[requestId];
        if (req.timestamp == 0) revert ReviewRequestNotFound(requestId);
        return req;
    }

    /**
     * @notice Retrieves active review request for a batch (if any).
     */
    function getActiveReviewRequest(bytes32 batchId) external view returns (AuditorReviewRequest memory) {
        uint256 activeId = _activeReviewRequestId[batchId];
        if (activeId == 0) revert NoActiveReviewRequest();
        return _reviewRequests[activeId];
    }

    /**
     * @notice Returns true if batch has been registered.
     */
    function batchExists(bytes32 batchId) external view returns (bool) {
        return _batches[batchId].producer != address(0);
    }
}
