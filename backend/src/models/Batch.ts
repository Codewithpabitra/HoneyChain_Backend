import mongoose, { Schema, Document, Types } from "mongoose";
import type { IApiaryLocation } from "./Apiary.js";

export type { IApiaryLocation };

export interface IQualityDetails {
  grade: "None" | "GradeA" | "GradeB" | "GradeC" | "Substandard";
  moisturePercentage?: number;
  moistureBasisPoints?: number;
  labReportHash?: string;
  labReportUrl?: string;
  labReportData?: Record<string, any>;
  certifiedBy?: string;
  certifiedByUserId?: Types.ObjectId;
  certifiedAt?: number;
  txHash?: string;
}

export interface ICustodyRecord {
  from: string;
  to: string;
  location: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  performedBy?: Types.ObjectId;
}

export interface IRecallDetails {
  recalled: boolean;
  reason?: string;
  recalledBy?: string;
  performedBy?: Types.ObjectId;
  recalledAt?: number;
  txHash?: string;
}

export interface IPendingTransfer {
  recipient: string;
  location: string;
  proposedAt: number;
  exists: boolean;
  txHash?: string;
}

export interface IAuditorReviewRecord {
  requestId: number;
  requester: string;
  reason: string;
  timestamp: number;
  active: boolean;
  resolved: boolean;
  decidedBy?: string;
  decidedAt?: number;
  resolutionNote?: string;
  txHash?: string;
}

export interface IBlockchainMetadata {
  network: string;
  chainId: number;
  contractAddress: string;
  registrationConfirmed: boolean;
  registrationTxHash?: string;
  registrationBlock?: number;
  registrationGasUsed?: string;
}

export interface IBatch extends Document {
  batchId: string;
  batchIdBytes32: string;
  producer: string;
  laboratory?: string;
  processor?: string;
  distributor?: string;
  currentCustodian: string;
  quantityGrams: number;
  harvestTimestamp: number;
  floralOrigin: string;
  sourceHives: string[];
  apiary?: Types.ObjectId;
  apiaryId?: string;
  hives?: Types.ObjectId[];
  apiaryLocation: IApiaryLocation;
  metadata: Record<string, any>;
  metadataHash: string;
  createdBy?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  status: "Registered" | "Certified" | "InTransit" | "Delivered" | "Recalled";
  quality: IQualityDetails;
  custodyHistory: ICustodyRecord[];
  pendingTransfer?: IPendingTransfer;
  reviewRequest?: IAuditorReviewRecord;
  recall: IRecallDetails;
  blockchain: IBlockchainMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const ApiaryLocationSchema = new Schema<IApiaryLocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    region: { type: String, required: true },
    elevationMeters: { type: Number },
  },
  { _id: false }
);

const QualitySchema = new Schema<IQualityDetails>(
  {
    grade: {
      type: String,
      enum: ["None", "GradeA", "GradeB", "GradeC", "Substandard"],
      default: "None",
    },
    moisturePercentage: { type: Number },
    moistureBasisPoints: { type: Number },
    labReportHash: { type: String },
    labReportUrl: { type: String },
    labReportData: { type: Schema.Types.Mixed },
    certifiedBy: { type: String },
    certifiedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    certifiedAt: { type: Number },
    txHash: { type: String },
  },
  { _id: false }
);

const CustodyRecordSchema = new Schema<ICustodyRecord>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    location: { type: String, required: true },
    timestamp: { type: Number, required: true },
    txHash: { type: String },
    blockNumber: { type: Number },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const RecallSchema = new Schema<IRecallDetails>(
  {
    recalled: { type: Boolean, default: false },
    reason: { type: String },
    recalledBy: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    recalledAt: { type: Number },
    txHash: { type: String },
  },
  { _id: false }
);

const PendingTransferSchema = new Schema<IPendingTransfer>(
  {
    recipient: { type: String, required: true },
    location: { type: String, required: true },
    proposedAt: { type: Number, required: true },
    exists: { type: Boolean, default: true },
    txHash: { type: String },
  },
  { _id: false }
);

const AuditorReviewRequestSchema = new Schema<IAuditorReviewRecord>(
  {
    requestId: { type: Number, required: true },
    requester: { type: String, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Number, required: true },
    active: { type: Boolean, default: true },
    resolved: { type: Boolean, default: false },
    decidedBy: { type: String },
    decidedAt: { type: Number },
    resolutionNote: { type: String },
    txHash: { type: String },
  },
  { _id: false }
);

const BlockchainMetadataSchema = new Schema<IBlockchainMetadata>(
  {
    network: { type: String, default: "Ethereum Sepolia" },
    chainId: { type: Number, default: 11155111 },
    contractAddress: { type: String, required: true },
    registrationConfirmed: { type: Boolean, default: false },
    registrationTxHash: { type: String },
    registrationBlock: { type: Number },
    registrationGasUsed: { type: String },
  },
  { _id: false }
);

const BatchSchema = new Schema<IBatch>(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    batchIdBytes32: {
      type: String,
      required: true,
      index: true,
    },
    producer: {
      type: String,
      required: true,
      index: true,
    },
    laboratory: {
      type: String,
      index: true,
    },
    processor: {
      type: String,
      index: true,
    },
    distributor: {
      type: String,
      index: true,
    },
    currentCustodian: {
      type: String,
      required: true,
      index: true,
    },
    quantityGrams: {
      type: Number,
      required: true,
      min: 1,
    },
    harvestTimestamp: {
      type: Number,
      required: true,
    },
    floralOrigin: {
      type: String,
      required: true,
    },
    sourceHives: {
      type: [String],
      default: [],
    },
    apiary: {
      type: Schema.Types.ObjectId,
      ref: "Apiary",
      required: false,
      index: true,
    },
    apiaryId: {
      type: String,
      required: false,
      index: true,
    },
    hives: [
      {
        type: Schema.Types.ObjectId,
        ref: "Hive",
      },
    ],
    apiaryLocation: {
      type: ApiaryLocationSchema,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadataHash: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["Registered", "Certified", "InTransit", "Delivered", "Recalled"],
      default: "Registered",
      index: true,
    },
    quality: {
      type: QualitySchema,
      default: () => ({ grade: "None" }),
    },
    custodyHistory: {
      type: [CustodyRecordSchema],
      default: [],
    },
    pendingTransfer: {
      type: PendingTransferSchema,
      required: false,
    },
    reviewRequest: {
      type: AuditorReviewRequestSchema,
      required: false,
    },
    recall: {
      type: RecallSchema,
      default: () => ({ recalled: false }),
    },
    blockchain: {
      type: BlockchainMetadataSchema,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Batch = mongoose.model<IBatch>("Batch", BatchSchema);
export default Batch;
