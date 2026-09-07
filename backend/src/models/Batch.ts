import mongoose, { Schema, Document, Types } from "mongoose";
import { IApiaryLocation } from "./Apiary.js";

export { IApiaryLocation };

export interface IQualityDetails {
  grade: "None" | "GradeA" | "GradeB" | "GradeC" | "Substandard";
  moisturePercentage?: number;
  moistureBasisPoints?: number;
  labReportHash?: string;
  labReportData?: Record<string, any>;
  certifiedBy?: string;
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
}

export interface IRecallDetails {
  recalled: boolean;
  reason?: string;
  recalledBy?: string;
  recalledAt?: number;
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
  status: "Registered" | "Certified" | "InTransit" | "Delivered" | "Recalled";
  quality: IQualityDetails;
  custodyHistory: ICustodyRecord[];
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
    labReportData: { type: Schema.Types.Mixed },
    certifiedBy: { type: String },
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
  },
  { _id: false }
);

const RecallSchema = new Schema<IRecallDetails>(
  {
    recalled: { type: Boolean, default: false },
    reason: { type: String },
    recalledBy: { type: String },
    recalledAt: { type: Number },
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
