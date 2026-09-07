import { ethers } from "ethers";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";

const require = createRequire(import.meta.url);

// Load contract deployment artifact
const artifactPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../blockchain/deployments/sepolia/HoneyChainRegistry.json"
);
const deploymentArtifact = require(artifactPath);

export enum BatchStatus {
  Registered = 0,
  Certified = 1,
  InTransit = 2,
  Delivered = 3,
  Recalled = 4,
}

export enum QualityGrade {
  None = 0,
  GradeA = 1,
  GradeB = 2,
  GradeC = 3,
  Substandard = 4,
}

export const BatchStatusNames: Record<number, string> = {
  0: "Registered",
  1: "Certified",
  2: "InTransit",
  3: "Delivered",
  4: "Recalled",
};

export const QualityGradeNames: Record<number, string> = {
  0: "None",
  1: "GradeA",
  2: "GradeB",
  3: "GradeC",
  4: "Substandard",
};

export type RoleName =
  | "beekeeper"
  | "laboratory"
  | "processor"
  | "distributor"
  | "auditor"
  | "admin";

export class BlockchainService {
  public provider: ethers.JsonRpcProvider;
  public contractAddress: string;
  public deploymentBlock: number;
  private abi: any[];
  public readOnlyContract: ethers.Contract;

  constructor() {
    this.contractAddress = env.CONTRACT_ADDRESS || deploymentArtifact.contractAddress;
    this.deploymentBlock = deploymentArtifact.blockNumber || 11655688;
    this.abi = deploymentArtifact.abi;
    this.provider = new ethers.JsonRpcProvider(env.SEPOLIA_RPC_URL);
    this.readOnlyContract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
  }

  /**
   * Derives a 32-byte hash/hex representation for a batch ID string.
   */
  public formatBytes32BatchId(batchId: string): string {
    if (batchId.startsWith("0x") && batchId.length === 66) {
      return batchId;
    }
    return ethers.id(batchId);
  }

  /**
   * Deterministically hashes metadata object into SHA-256 digest (0x-prefixed 32 bytes).
   */
  public generateMetadataHash(metadata: Record<string, any>): string {
    const canonicalJson = this.canonicalizeObject(metadata);
    return "0x" + crypto.createHash("sha256").update(canonicalJson).digest("hex");
  }

  /**
   * Deterministically hashes lab report object or string into SHA-256 digest.
   */
  public generateLabReportHash(reportData: Record<string, any> | string): string {
    const content =
      typeof reportData === "string" ? reportData : this.canonicalizeObject(reportData);
    return "0x" + crypto.createHash("sha256").update(content).digest("hex");
  }

  public canonicalizeObject(obj: any): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map((item) => this.canonicalizeObject(item)).join(",") + "]";
    }
    const keys = Object.keys(obj).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${this.canonicalizeObject(obj[key])}`
    );
    return "{" + entries.join(",") + "}";
  }

  /**
   * Resolves a role-connected signer wallet and contract instance.
   */
  public getRoleContract(role: RoleName): { contract: ethers.Contract; signer: ethers.Wallet } {
    let privateKey: string | undefined;

    switch (role) {
      case "beekeeper":
        privateKey = env.BEEKEEPER_PRIVATE_KEY;
        break;
      case "laboratory":
        privateKey = env.LABORATORY_PRIVATE_KEY;
        break;
      case "processor":
        privateKey = env.PROCESSOR_PRIVATE_KEY;
        break;
      case "distributor":
        privateKey = env.DISTRIBUTOR_PRIVATE_KEY;
        break;
      case "auditor":
        privateKey = env.AUDITOR_PRIVATE_KEY;
        break;
      case "admin":
        privateKey = env.ADMIN_PRIVATE_KEY;
        break;
    }

    if (!privateKey) {
      throw new AppError(`Missing private key configuration for role: ${role}`, 500);
    }

    const signer = new ethers.Wallet(privateKey, this.provider);
    const contract = new ethers.Contract(this.contractAddress, this.abi, signer);
    return { contract, signer };
  }

  /**
   * Handles and decodes contract error data into readable AppError.
   */
  public parseBlockchainError(error: any): Error {
    const errorData =
      error?.data ||
      error?.info?.error?.data ||
      error?.error?.data ||
      error?.receipt?.revertReason;

    if (errorData && typeof errorData === "string") {
      try {
        const decoded = this.readOnlyContract.interface.parseError(errorData);
        if (decoded) {
          switch (decoded.name) {
            case "BatchAlreadyExists":
              return new AppError(`Batch already registered on blockchain (${decoded.args[0]})`, 409);
            case "BatchDoesNotExist":
              return new AppError(`Batch does not exist on blockchain (${decoded.args[0]})`, 404);
            case "BatchAlreadyRecalled":
              return new AppError(`Batch is already recalled and cannot be modified`, 400);
            case "BatchAlreadyCertified":
              return new AppError(`Batch has already received laboratory certification`, 400);
            case "InvalidBatchId":
              return new AppError(`Invalid batch identifier supplied`, 400);
            case "InvalidQuantity":
              return new AppError(`Harvest quantity must be greater than zero`, 400);
            case "InvalidMetadataHash":
              return new AppError(`Invalid metadata digest supplied`, 400);
            case "InvalidLabReportHash":
              return new AppError(`Invalid lab report digest supplied`, 400);
            case "InvalidQualityGrade":
              return new AppError(`Quality grade cannot be None or invalid`, 400);
            case "InvalidRecipient":
              return new AppError(`Recipient address is invalid or identical to current custodian`, 400);
            case "NotCurrentCustodian":
              return new AppError(
                `Caller (${decoded.args[0]}) is not the current custodian (${decoded.args[1]})`,
                403
              );
            case "UnauthorizedRecall":
              return new AppError(`Caller (${decoded.args[0]}) is not authorized to recall this batch`, 403);
            case "RecipientNotAuthorized":
              return new AppError(`Recipient (${decoded.args[0]}) lacks authorized supply chain role`, 400);
            case "AccessControlUnauthorizedAccount":
              return new AppError(
                `Account ${decoded.args[0]} lacks required role ${decoded.args[1]}`,
                403
              );
            default:
              return new AppError(`Contract revert: ${decoded.name}`, 400);
          }
        }
      } catch {
        // Fall through to general error parsing
      }
    }

    if (error?.message?.includes("insufficient funds")) {
      return new AppError("Testnet wallet has insufficient funds for gas fees", 503);
    }
    if (error?.code === "TIMEOUT" || error?.message?.includes("timeout")) {
      return new AppError("Sepolia RPC timeout while awaiting confirmation", 504);
    }

    return new AppError(error?.reason || error?.shortMessage || error?.message || "Blockchain transaction failed", 500);
  }

  /**
   * Registers a harvest batch on-chain (signed by Beekeeper).
   */
  public async registerBatch(
    batchId: string,
    quantityGrams: number,
    metadataHash: string,
    harvestTimestamp: number = Math.floor(Date.now() / 1000)
  ) {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);

    try {
      const { contract } = this.getRoleContract("beekeeper");
      const tx = await contract.registerBatch(
        batchIdBytes32,
        quantityGrams,
        metadataHash,
        harvestTimestamp
      );
      const receipt = await tx.wait(1);

      return {
        success: true,
        batchId,
        batchIdBytes32,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }

  /**
   * Certifies a registered batch with lab quality results (signed by Laboratory).
   */
  public async certifyBatch(
    batchId: string,
    labReportHash: string,
    qualityGrade: QualityGrade | number,
    moistureBasisPoints: number
  ) {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);

    try {
      const { contract } = this.getRoleContract("laboratory");
      const tx = await contract.certifyBatch(
        batchIdBytes32,
        labReportHash,
        qualityGrade,
        moistureBasisPoints
      );
      const receipt = await tx.wait(1);

      return {
        success: true,
        batchId,
        batchIdBytes32,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }

  /**
   * Transfers custody of a batch to another participant.
   */
  public async transferCustody(
    batchId: string,
    toAddress: string,
    location: string,
    fromRole: "beekeeper" | "processor" | "distributor"
  ) {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);

    try {
      const { contract } = this.getRoleContract(fromRole);
      const tx = await contract.transferCustody(batchIdBytes32, toAddress, location);
      const receipt = await tx.wait(1);

      return {
        success: true,
        batchId,
        batchIdBytes32,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }

  /**
   * Recalls a batch on-chain (signed by Auditor, Beekeeper, Lab, or Admin).
   */
  public async recallBatch(
    batchId: string,
    reason: string,
    callerRole: RoleName = "auditor"
  ) {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);

    try {
      const { contract } = this.getRoleContract(callerRole);
      const tx = await contract.recallBatch(batchIdBytes32, reason);
      const receipt = await tx.wait(1);

      return {
        success: true,
        batchId,
        batchIdBytes32,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }

  /**
   * Checks if a batch exists on-chain.
   */
  public async batchExists(batchId: string): Promise<boolean> {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);
    try {
      return await this.readOnlyContract.batchExists(batchIdBytes32);
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }

  /**
   * Reads raw HoneyBatch struct from the contract.
   */
  public async getBatch(batchId: string) {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);
    try {
      const raw = await this.readOnlyContract.getBatch(batchIdBytes32);
      const statusNum = Number(raw.status);
      const gradeNum = Number(raw.qualityGrade);

      return {
        batchIdBytes32,
        metadataHash: raw.metadataHash,
        labReportHash: raw.labReportHash,
        producer: raw.producer,
        harvestTimestamp: Number(raw.harvestTimestamp),
        certifier: raw.certifier,
        certificationTimestamp: Number(raw.certificationTimestamp),
        currentCustodian: raw.currentCustodian,
        quantityGrams: Number(raw.quantityGrams),
        moistureBasisPoints: Number(raw.moistureBasisPoints),
        moisturePercentage: Number(raw.moistureBasisPoints) / 100,
        status: statusNum,
        statusName: BatchStatusNames[statusNum] || "Unknown",
        qualityGrade: gradeNum,
        qualityGradeName: QualityGradeNames[gradeNum] || "Unknown",
      };
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }

  /**
   * Queries on-chain events to reconstruct complete historical lifecycle audit trail.
   */
  public async getBatchHistory(batchId: string) {
    const batchIdBytes32 = this.formatBytes32BatchId(batchId);

    try {
      // Query events using indexed batchId filters from contract deployment block
      const fromBlock = this.deploymentBlock;

      const registeredFilter = this.readOnlyContract.filters.BatchRegistered(batchIdBytes32);
      const certifiedFilter = this.readOnlyContract.filters.BatchCertified(batchIdBytes32);
      const custodyFilter = this.readOnlyContract.filters.CustodyTransferred(batchIdBytes32);
      const recalledFilter = this.readOnlyContract.filters.BatchRecalled(batchIdBytes32);

      const [regLogs, certLogs, custodyLogs, recallLogs] = await Promise.all([
        this.readOnlyContract.queryFilter(registeredFilter, fromBlock),
        this.readOnlyContract.queryFilter(certifiedFilter, fromBlock),
        this.readOnlyContract.queryFilter(custodyFilter, fromBlock),
        this.readOnlyContract.queryFilter(recalledFilter, fromBlock),
      ]);

      const history: Array<{
        stage: string;
        eventType: string;
        txHash: string;
        blockNumber: number;
        timestamp: number;
        details: Record<string, any>;
      }> = [];

      for (const log of regLogs as ethers.EventLog[]) {
        history.push({
          stage: "Harvest & Batch Registration",
          eventType: "BatchRegistered",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: Number(log.args.harvestTimestamp),
          details: {
            beekeeper: log.args.beekeeper,
            quantityGrams: Number(log.args.quantityGrams),
            metadataHash: log.args.metadataHash,
          },
        });
      }

      for (const log of certLogs as ethers.EventLog[]) {
        const grade = Number(log.args.qualityGrade);
        history.push({
          stage: "Lab Quality Certification",
          eventType: "BatchCertified",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: Number(log.args.certificationTimestamp),
          details: {
            laboratory: log.args.laboratory,
            labReportHash: log.args.labReportHash,
            qualityGrade: QualityGradeNames[grade] || grade,
            moisturePercentage: Number(log.args.moistureBasisPoints) / 100,
          },
        });
      }

      for (const log of custodyLogs as ethers.EventLog[]) {
        history.push({
          stage: "Custody Transfer",
          eventType: "CustodyTransferred",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: Number(log.args.timestamp),
          details: {
            from: log.args.from,
            to: log.args.to,
            location: log.args.location,
          },
        });
      }

      for (const log of recallLogs as ethers.EventLog[]) {
        history.push({
          stage: "Batch Recall",
          eventType: "BatchRecalled",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: Number(log.args.timestamp),
          details: {
            recalledBy: log.args.by,
            reason: log.args.reason,
          },
        });
      }

      // Sort timeline chronologically by blockNumber & timestamp
      history.sort((a, b) => a.blockNumber - b.blockNumber || a.timestamp - b.timestamp);

      return history;
    } catch (err: any) {
      throw this.parseBlockchainError(err);
    }
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;
