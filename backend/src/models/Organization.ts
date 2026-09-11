import mongoose, { Schema, Document, Types } from "mongoose";

export type OrganizationRole =
  | "admin"
  | "beekeeper"
  | "processor"
  | "lab"
  | "distributor"
  | "transporter"
  | "auditor";

export type OrganizationType =
  | "beekeeper"
  | "processor"
  | "lab"
  | "distributor"
  | "transporter"
  | "auditor";

export type OrganizationStatus = "pending" | "active" | "rejected" | "suspended";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  role: OrganizationRole;
  organizationType: OrganizationType;
  walletAddress: string;
  encryptedPrivateKey?: string;
  isActive: boolean;
  status: OrganizationStatus;
  applicationId?: Types.ObjectId;
  adminUserId?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "beekeeper", "processor", "lab", "distributor", "transporter", "auditor"],
      required: [true, "Organization role/type is required"],
      index: true,
    },
    organizationType: {
      type: String,
      enum: ["beekeeper", "processor", "lab", "distributor", "transporter", "auditor"],
      index: true,
    },
    walletAddress: {
      type: String,
      required: [true, "Wallet address is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    encryptedPrivateKey: {
      type: String,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "active",
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "OrganizationApplication",
    },
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.encryptedPrivateKey;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Organization = mongoose.model<IOrganization>("Organization", OrganizationSchema);
export default Organization;
