export type BatchStatus =
  | "Registered"
  | "Certified"
  | "InTransit"
  | "Recalled";

export type QualityGrade = "GradeA" | "GradeB" | "GradeC" | "Substandard";

export interface ApiaryLocation {
  latitude: number;
  longitude: number;
  region: string;
  elevationMeters?: number;
}

export interface BlockchainInfo {
  network: string;
  chainId: number;
  contractAddress?: string;
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
  txHash: string;
  blockNumber: number;
}

export interface QualityInfo {
  grade: QualityGrade;
  moisturePercentage: number;
  certifiedBy: string;
  certificationTimestamp: number;
  labReportHash: string;
  labReportData?: Record<string, number | string>;
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

export interface BatchVerification {
  success: boolean;
  batchId: string;
  verifiedOnChain: boolean;
  tamperProofAudit: TamperAudit;
  blockchain: BlockchainInfo & { status: BatchStatus; producer: string; currentCustodian: string };
  quality?: QualityInfo;
  harvest: HarvestInfo;
  custodyTimeline: CustodyEvent[];
}