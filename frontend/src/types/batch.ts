// src/types/batch.ts

export type BatchStatus =
  | "Created"
  | "Registered"
  | "Certified"
  | "InTransit"
  | "Delivered"
  | "Recalled";

export type QualityGrade =
  | "GradeA"
  | "GradeB"
  | "GradeC"
  | "Substandard"
  | "None";

export interface ApiaryLocation {
  latitude: number;
  longitude: number;
  region: string;
  address?: string;
  elevationMeters?: number;
}

export interface BlockchainInfo {
  network: string;
  chainId: number;
  contractAddress?: string;
  registrationConfirmed?: boolean;
  registrationTxHash?: string;
  registrationBlock?: number;
  registrationGasUsed?: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  etherscanUrl?: string;
}

export interface CustodyEvent {
  from: string;
  to: string;
  location: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  performedBy?: string;
}

export interface QualityInfo {
  grade: QualityGrade;
  moisturePercentage?: number;
  moistureBasisPoints?: number;
  certifiedBy?: string;
  certifiedByUserId?: string;
  certifiedAt?: number;
  certificationTimestamp?: number;
  labReportHash?: string;
  labReportUrl?: string;
  labReportData?: Record<string, any>;
  txHash?: string;
}

export interface RecallInfo {
  recalled: boolean;
  reason?: string;
  recalledBy?: string;
  performedBy?: string;
  recalledAt?: number;
  txHash?: string;
}

export interface HarvestInfo {
  producer: string;
  harvestTimestamp: number;
  quantityGrams: number;
  quantityKg: number;
  floralOrigin: string;
  sourceHives: string[];
  apiaryLocation: ApiaryLocation;
}

export interface TamperAudit {
  integrityVerified: boolean;
  metadataHashMatch: boolean;
  labReportHashMatch: boolean;
  onChainMetadataHash: string;
  offChainMetadataHash: string;
}

export interface BatchItem {
  _id: string;
  batchId: string;
  batchIdBytes32?: string;
  producer: string;
  currentCustodian: string;
  quantityGrams: number;
  quantityKg?: number;
  totalQuantity?: number;
  harvestTimestamp: number;
  floralOrigin: string;
  sourceHives: string[];
  apiary?: {
    _id: string;
    name: string;
    location: ApiaryLocation;
    floraType?: string[];
  } | string;
  apiaryId?: string;
  hives?: Array<{
    _id: string;
    hiveId: string;
    beeSpecies?: string;
    currentHealthSummary?: {
      healthScore?: number;
      status: string;
    };
  }>;
  apiaryLocation: ApiaryLocation;
  status: BatchStatus;
  blockchain: BlockchainInfo;
  quality?: QualityInfo;
  custodyHistory: CustodyEvent[];
  recall?: RecallInfo;
  organizationId?: {
    _id: string;
    name: string;
    walletAddress?: string;
    role?: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchVerification {
  success: boolean;
  batchId: string;
  verifiedOnChain: boolean;
  tamperProofAudit: TamperAudit;
  blockchain: BlockchainInfo & {
    status: BatchStatus;
    producer: string;
    currentCustodian: string;
  };
  quality?: QualityInfo;
  harvest: HarvestInfo;
  custodyTimeline: CustodyEvent[];
  recall?: RecallInfo;
}

export interface CreateBatchPayload {
  batchId?: string;
  quantityGrams: number;
  floralOrigin: string;
  sourceHives?: string[];
  apiaryLocation: ApiaryLocation;
  harvestTimestamp?: number;
  extraMetadata?: Record<string, unknown>;
}

export interface DeliverBatchPayload {
  to?: string;
  location: string;
  role?: string;
}

export interface TransferBatchPayload {
  to: string;
  location: string;
  role?: "beekeeper" | "processor" | "distributor" | "transporter" | string;
}

export interface BatchListResponse {
  success: boolean;
  data: BatchItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UploadCertificateResponse {
  success: boolean;
  message: string;
  batchId: string;
  labReportHash: string;
  labReportUrl: string;
  sizeBytes: number;
}