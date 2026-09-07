// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title HoneyChainRegistry
 * @dev Provenance and traceability registry for HoneyChain on Polygon Amoy.
 * Records harvest batches, lab certifications, custody handoffs, and recalls.
 */
contract HoneyChainRegistry is AccessControl {
    // Role Definitions
    bytes32 public constant BEEKEEPER_ROLE = keccak256("BEEKEEPER_ROLE");
    bytes32 public constant LABORATORY_ROLE = keccak256("LABORATORY_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum BatchStatus {
        Registered,   // 0: Registered by beekeeper
        Certified,    // 1: Quality certified by laboratory
        InTransit,    // 2: In custody transfer / processing / transit
        Delivered,    // 3: Delivered to end distributor / retailer
        Recalled      // 4: Recalled due to contamination or defect (terminal)
    }

    enum QualityGrade {
        None,         // 0: Uncertified
        GradeA,       // 1: Premium purity (Moisture <= 18.00%)
        GradeB,       // 2: Standard commercial table grade (Moisture <= 20.00%)
        GradeC,       // 3: Industrial/baking grade
        Substandard   // 4: Failed purity or adulteration tests
    }

    struct HoneyBatch {
        bytes32 metadataHash;            // SHA-256 digest of MongoDB harvest metadata
        bytes32 labReportHash;           // SHA-256 / IPFS digest of lab certificate
        address producer;                // Beekeeper wallet that harvested the batch
        uint64 harvestTimestamp;         // Unix timestamp of harvest
        address certifier;               // Laboratory wallet that certified the batch
        uint64 certificationTimestamp;   // Unix timestamp when certified
        address currentCustodian;        // Current wallet holding custody
        uint64 quantityGrams;            // Quantity in grams
        uint16 moistureBasisPoints;      // Moisture % in basis points (1825 = 18.25%)
        BatchStatus status;              // Current batch lifecycle status
        QualityGrade qualityGrade;       // Laboratory quality grade
    }

    // Mapping from batchId to HoneyBatch data
    mapping(bytes32 => HoneyBatch) private _batches;

    // Events
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

    // Custom Errors
    error BatchAlreadyExists(bytes32 batchId);
    error BatchDoesNotExist(bytes32 batchId);
    error BatchAlreadyRecalled(bytes32 batchId);
    error BatchAlreadyCertified(bytes32 batchId);
    error InvalidBatchId();
    error InvalidQuantity();
    error InvalidMetadataHash();
    error InvalidLabReportHash();
    error InvalidQualityGrade();
    error InvalidRecipient();
    error NotCurrentCustodian(address caller, address currentCustodian);
    error UnauthorizedRecall(address caller);
    error RecipientNotAuthorized(address recipient);

    /**
     * @dev Initializes the contract with an initial administrator.
     * @param initialAdmin Address receiving DEFAULT_ADMIN_ROLE.
     */
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidRecipient();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    /**
     * @dev Registers a new honey harvest batch.
     * Only accounts with BEEKEEPER_ROLE can register batches.
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

        uint64 actualHarvestTimestamp = harvestTimestamp == 0
            ? uint64(block.timestamp)
            : harvestTimestamp;

        HoneyBatch storage batch = _batches[batchId];
        batch.metadataHash = metadataHash;
        batch.producer = msg.sender;
        batch.harvestTimestamp = actualHarvestTimestamp;
        batch.currentCustodian = msg.sender;
        batch.quantityGrams = quantityGrams;
        batch.status = BatchStatus.Registered;
        batch.qualityGrade = QualityGrade.None;

        emit BatchRegistered(
            batchId,
            msg.sender,
            quantityGrams,
            metadataHash,
            actualHarvestTimestamp
        );

        return true;
    }

    /**
     * @dev Certifies a registered batch with laboratory quality results.
     * Only accounts with LABORATORY_ROLE can certify batches.
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
        if (batch.certifier != address(0)) revert BatchAlreadyCertified(batchId);
        if (labReportHash == bytes32(0)) revert InvalidLabReportHash();
        if (qualityGrade == QualityGrade.None) revert InvalidQualityGrade();

        uint64 certTimestamp = uint64(block.timestamp);
        batch.certifier = msg.sender;
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

    /**
     * @dev Transfers custody of a batch to another verified actor.
     * Only the current custodian can transfer custody.
     */
    function transferCustody(
        bytes32 batchId,
        address to,
        string calldata location
    ) external returns (bool) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);
        if (msg.sender != batch.currentCustodian) {
            revert NotCurrentCustodian(msg.sender, batch.currentCustodian);
        }
        if (to == address(0) || to == msg.sender) revert InvalidRecipient();

        // Ensure recipient is an authorized supply chain stakeholder
        bool isAuthorizedRecipient = hasRole(PROCESSOR_ROLE, to) ||
            hasRole(DISTRIBUTOR_ROLE, to) ||
            hasRole(BEEKEEPER_ROLE, to);
        if (!isAuthorizedRecipient) revert RecipientNotAuthorized(to);

        batch.currentCustodian = to;
        batch.status = BatchStatus.InTransit;

        emit CustodyTransferred(
            batchId,
            msg.sender,
            to,
            location,
            uint64(block.timestamp)
        );

        return true;
    }

    /**
     * @dev Recalls a defective or contaminated batch.
     * Can be invoked by Admin, the batch Producer, Laboratory, or Auditor.
     */
    function recallBatch(
        bytes32 batchId,
        string calldata reason
    ) external returns (bool) {
        HoneyBatch storage batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        if (batch.status == BatchStatus.Recalled) revert BatchAlreadyRecalled(batchId);

        bool isAuthorized = hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            hasRole(AUDITOR_ROLE, msg.sender) ||
            hasRole(LABORATORY_ROLE, msg.sender) ||
            msg.sender == batch.producer;

        if (!isAuthorized) revert UnauthorizedRecall(msg.sender);

        batch.status = BatchStatus.Recalled;

        emit BatchRecalled(
            batchId,
            msg.sender,
            reason,
            uint64(block.timestamp)
        );

        return true;
    }

    /**
     * @dev View function to retrieve batch details.
     */
    function getBatch(bytes32 batchId) external view returns (HoneyBatch memory) {
        HoneyBatch memory batch = _batches[batchId];
        if (batch.producer == address(0)) revert BatchDoesNotExist(batchId);
        return batch;
    }

    /**
     * @dev Checks if a batch ID has already been registered.
     */
    function batchExists(bytes32 batchId) external view returns (bool) {
        return _batches[batchId].producer != address(0);
    }
}
