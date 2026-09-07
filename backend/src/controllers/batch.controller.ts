import { Request, Response, NextFunction } from "express";
import { Batch } from "../models/Batch.js";
import blockchainService, {
  QualityGrade,
  RoleName,
} from "../services/blockchain.service.js";
import AppError from "../utils/AppError.js";

/**
 * Maps human-readable quality grades to contract enum integers.
 */
const QualityGradeMap: Record<string, QualityGrade> = {
  GradeA: QualityGrade.GradeA,
  GradeB: QualityGrade.GradeB,
  GradeC: QualityGrade.GradeC,
  Substandard: QualityGrade.Substandard,
};

export class BatchController {
  /**
   * POST /api/batches
   * Beekeeper registers a new honey harvest batch.
   */
  public registerBatch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        batchId: inputBatchId,
        quantityGrams,
        floralOrigin,
        sourceHives = [],
        apiaryLocation,
        harvestTimestamp: inputHarvestTimestamp,
        extraMetadata = {},
      } = req.body;

      if (!quantityGrams || quantityGrams <= 0) {
        return next(new AppError("quantityGrams must be a positive integer", 400));
      }
      if (!floralOrigin || typeof floralOrigin !== "string") {
        return next(new AppError("floralOrigin is required", 400));
      }
      if (
        !apiaryLocation ||
        apiaryLocation.latitude === undefined ||
        apiaryLocation.longitude === undefined ||
        !apiaryLocation.region
      ) {
        return next(
          new AppError(
            "apiaryLocation requires latitude, longitude, and region",
            400
          )
        );
      }

      const batchId =
        inputBatchId?.trim() ||
        `HC-BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Check if batch already exists in MongoDB
      const existingBatch = await Batch.findOne({ batchId });
      if (existingBatch) {
        return next(
          new AppError(`Batch with ID '${batchId}' already exists in MongoDB`, 409)
        );
      }

      const harvestTimestamp =
        inputHarvestTimestamp || Math.floor(Date.now() / 1000);
      const batchIdBytes32 = blockchainService.formatBytes32BatchId(batchId);

      // Canonical metadata object to be hashed
      const metadataToHash = {
        batchId,
        quantityGrams,
        floralOrigin,
        sourceHives,
        apiaryLocation: {
          latitude: apiaryLocation.latitude,
          longitude: apiaryLocation.longitude,
          region: apiaryLocation.region,
          ...(apiaryLocation.elevationMeters && {
            elevationMeters: apiaryLocation.elevationMeters,
          }),
        },
        harvestTimestamp,
        ...extraMetadata,
      };

      const metadataHash = blockchainService.generateMetadataHash(metadataToHash);

      // Get Beekeeper address from role signer
      const { signer: beekeeperSigner } = blockchainService.getRoleContract("beekeeper");
      const beekeeperAddress = beekeeperSigner.address;

      // Stage draft batch in MongoDB
      const stagedBatch = new Batch({
        batchId,
        batchIdBytes32,
        producer: beekeeperAddress,
        currentCustodian: beekeeperAddress,
        quantityGrams,
        harvestTimestamp,
        floralOrigin,
        sourceHives,
        apiaryLocation,
        metadata: metadataToHash,
        metadataHash,
        status: "Registered",
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: blockchainService.contractAddress,
          registrationConfirmed: false,
        },
      });

      await stagedBatch.save();

      // Submit transaction to Ethereum Sepolia
      try {
        const txResult = await blockchainService.registerBatch(
          batchId,
          quantityGrams,
          metadataHash,
          harvestTimestamp
        );

        // Update MongoDB with confirmed on-chain details
        stagedBatch.blockchain.registrationConfirmed = true;
        stagedBatch.blockchain.registrationTxHash = txResult.txHash;
        stagedBatch.blockchain.registrationBlock = txResult.blockNumber;
        stagedBatch.blockchain.registrationGasUsed = txResult.gasUsed;
        await stagedBatch.save();

        return res.status(201).json({
          success: true,
          message: "Honey batch registered successfully on Ethereum Sepolia",
          data: stagedBatch,
          blockchain: {
            txHash: txResult.txHash,
            blockNumber: txResult.blockNumber,
            gasUsed: txResult.gasUsed,
            etherscanUrl: `https://sepolia.etherscan.io/tx/${txResult.txHash}`,
          },
        });
      } catch (blockchainErr) {
        // Rollback / clean up staged Mongo batch on blockchain failure to maintain strict consistency
        await Batch.deleteOne({ _id: stagedBatch._id });
        return next(blockchainErr);
      }
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/batches/:batchId/quality
   * Laboratory submits certified test report and quality grade.
   */
  public certifyBatch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const batchId = (Array.isArray(req.params.batchId)
        ? req.params.batchId[0]
        : req.params.batchId) as string;
      const {
        grade,
        moisturePercentage,
        labReportData = {},
        labReportHash: inputLabReportHash,
      } = req.body;

      if (!grade || !(grade in QualityGradeMap)) {
        return next(
          new AppError(
            "grade must be one of: GradeA, GradeB, GradeC, Substandard",
            400
          )
        );
      }
      if (
        moisturePercentage === undefined ||
        typeof moisturePercentage !== "number" ||
        moisturePercentage <= 0 ||
        moisturePercentage > 100
      ) {
        return next(
          new AppError(
            "moisturePercentage must be a positive number (e.g. 17.50)",
            400
          )
        );
      }

      const batch = await Batch.findOne({ batchId });
      if (!batch) {
        return next(new AppError(`Batch '${batchId}' not found in database`, 404));
      }
      if (batch.status === "Recalled") {
        return next(
          new AppError("Cannot certify a batch that has been recalled", 400)
        );
      }
      if (batch.status !== "Registered") {
        return next(
          new AppError(
            `Batch is in '${batch.status}' status and cannot receive initial certification`,
            400
          )
        );
      }

      const labReportHash =
        inputLabReportHash ||
        blockchainService.generateLabReportHash({
          batchId,
          grade,
          moisturePercentage,
          labReportData,
          certifiedAt: Math.floor(Date.now() / 1000),
        });

      const qualityGradeEnum = QualityGradeMap[grade];
      const moistureBasisPoints = Math.round(moisturePercentage * 100);

      const { signer: labSigner } = blockchainService.getRoleContract("laboratory");

      // Submit certification transaction to Ethereum Sepolia
      const txResult = await blockchainService.certifyBatch(
        batchId,
        labReportHash,
        qualityGradeEnum,
        moistureBasisPoints
      );

      // Update MongoDB record
      batch.status = "Certified";
      batch.quality = {
        grade: grade as any,
        moisturePercentage,
        moistureBasisPoints,
        labReportHash,
        labReportData,
        certifiedBy: labSigner.address,
        certifiedAt: Math.floor(Date.now() / 1000),
        txHash: txResult.txHash,
      };

      await batch.save();

      return res.status(200).json({
        success: true,
        message: "Batch quality certified successfully on Ethereum Sepolia",
        data: batch,
        blockchain: {
          txHash: txResult.txHash,
          blockNumber: txResult.blockNumber,
          gasUsed: txResult.gasUsed,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${txResult.txHash}`,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/batches/:batchId/transfer
   * Custody handoff to another authorized participant (Processor or Distributor).
   */
  public transferCustody = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const batchId = (Array.isArray(req.params.batchId)
        ? req.params.batchId[0]
        : req.params.batchId) as string;
      const { to, location, role } = req.body;

      if (!to || typeof to !== "string") {
        return next(new AppError("Recipient address 'to' is required", 400));
      }
      if (!location || typeof location !== "string") {
        return next(new AppError("Transfer 'location' is required", 400));
      }

      const batch = await Batch.findOne({ batchId });
      if (!batch) {
        return next(new AppError(`Batch '${batchId}' not found in database`, 404));
      }
      if (batch.status === "Recalled") {
        return next(
          new AppError("Cannot transfer custody of a recalled batch", 400)
        );
      }

      // Determine sender role
      let senderRole: "beekeeper" | "processor" | "distributor" = role;
      if (!senderRole) {
        if (batch.status === "Registered" || batch.status === "Certified") {
          senderRole = "beekeeper";
        } else {
          senderRole = "processor";
        }
      }

      const { signer: currentSigner } = blockchainService.getRoleContract(senderRole);

      // Execute on-chain transfer
      const txResult = await blockchainService.transferCustody(
        batchId,
        to,
        location,
        senderRole
      );

      const transferTimestamp = Math.floor(Date.now() / 1000);

      // Update MongoDB record
      const previousCustodian = batch.currentCustodian;
      batch.currentCustodian = to;
      batch.status = "InTransit";
      batch.custodyHistory.push({
        from: previousCustodian || currentSigner.address,
        to,
        location,
        timestamp: transferTimestamp,
        txHash: txResult.txHash,
        blockNumber: txResult.blockNumber,
      });

      await batch.save();

      return res.status(200).json({
        success: true,
        message: "Batch custody transferred successfully on Ethereum Sepolia",
        data: batch,
        blockchain: {
          txHash: txResult.txHash,
          blockNumber: txResult.blockNumber,
          gasUsed: txResult.gasUsed,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${txResult.txHash}`,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/batches/:batchId/recall
   * Recalls defective or contaminated batch.
   */
  public recallBatch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const batchId = (Array.isArray(req.params.batchId)
        ? req.params.batchId[0]
        : req.params.batchId) as string;
      const { reason, role = "auditor" } = req.body;

      if (!reason || typeof reason !== "string") {
        return next(new AppError("Recall 'reason' is required", 400));
      }

      const batch = await Batch.findOne({ batchId });
      if (!batch) {
        return next(new AppError(`Batch '${batchId}' not found in database`, 404));
      }
      if (batch.status === "Recalled" || batch.recall.recalled) {
        return next(new AppError("Batch is already recalled", 400));
      }

      const { signer: callerSigner } = blockchainService.getRoleContract(role as RoleName);

      // Execute on-chain recall
      const txResult = await blockchainService.recallBatch(
        batchId,
        reason,
        role as RoleName
      );

      const recallTimestamp = Math.floor(Date.now() / 1000);

      // Update MongoDB record
      batch.status = "Recalled";
      batch.recall = {
        recalled: true,
        reason,
        recalledBy: callerSigner.address,
        recalledAt: recallTimestamp,
        txHash: txResult.txHash,
      };

      await batch.save();

      return res.status(200).json({
        success: true,
        message: "Batch recalled successfully on Ethereum Sepolia",
        data: batch,
        blockchain: {
          txHash: txResult.txHash,
          blockNumber: txResult.blockNumber,
          gasUsed: txResult.gasUsed,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${txResult.txHash}`,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/verify/:batchId
   * Public consumer and auditor verification endpoint.
   * Reads state from MongoDB and Ethereum Sepolia, detects tampering, and reconstructs event history.
   */
  public verifyBatch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const batchId = (Array.isArray(req.params.batchId)
        ? req.params.batchId[0]
        : req.params.batchId) as string;

      const batch = await Batch.findOne({ batchId });
      if (!batch) {
        return next(
          new AppError(`Batch '${batchId}' not found in local registry`, 404)
        );
      }

      // Check on-chain existence and state
      const onChainBatch = await blockchainService.getBatch(batchId);
      const onChainHistory = await blockchainService.getBatchHistory(batchId);

      // Recompute local SHA-256 hash to detect data tampering
      const computedMetadataHash = blockchainService.generateMetadataHash(
        batch.metadata
      );
      const metadataHashMatches =
        computedMetadataHash.toLowerCase() ===
        onChainBatch.metadataHash.toLowerCase();

      let labReportHashMatches = true;
      if (batch.quality.labReportHash) {
        labReportHashMatches =
          batch.quality.labReportHash.toLowerCase() ===
          onChainBatch.labReportHash.toLowerCase();
      }

      const isIntegrityVerified = metadataHashMatches && labReportHashMatches;

      return res.status(200).json({
        success: true,
        batchId,
        verifiedOnChain: true,
        tamperProofAudit: {
          integrityVerified: isIntegrityVerified,
          metadataHashMatch: metadataHashMatches,
          labReportHashMatch: labReportHashMatches,
          onChainMetadataHash: onChainBatch.metadataHash,
          offChainMetadataHash: computedMetadataHash,
        },
        blockchain: {
          network: "Ethereum Sepolia",
          chainId: 11155111,
          contractAddress: blockchainService.contractAddress,
          status: onChainBatch.statusName,
          producer: onChainBatch.producer,
          currentCustodian: onChainBatch.currentCustodian,
          registrationTxHash: batch.blockchain.registrationTxHash,
          etherscanUrl: batch.blockchain.registrationTxHash
            ? `https://sepolia.etherscan.io/tx/${batch.blockchain.registrationTxHash}`
            : undefined,
        },
        quality: {
          grade: onChainBatch.qualityGradeName,
          moisturePercentage: onChainBatch.moisturePercentage,
          certifiedBy: onChainBatch.certifier,
          certificationTimestamp: onChainBatch.certificationTimestamp,
          labReportHash: onChainBatch.labReportHash,
          labReportData: batch.quality.labReportData,
        },
        harvest: {
          producer: onChainBatch.producer,
          harvestTimestamp: onChainBatch.harvestTimestamp,
          quantityGrams: onChainBatch.quantityGrams,
          quantityKg: onChainBatch.quantityGrams / 1000,
          floralOrigin: batch.floralOrigin,
          sourceHives: batch.sourceHives,
          apiaryLocation: batch.apiaryLocation,
        },
        custodyTimeline: onChainHistory,
        recall: batch.recall.recalled
          ? {
              recalled: true,
              reason: batch.recall.reason,
              recalledBy: batch.recall.recalledBy,
              recalledAt: batch.recall.recalledAt,
              txHash: batch.recall.txHash,
            }
          : undefined,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const batchController = new BatchController();
export default batchController;
