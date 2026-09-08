import mongoose, { Schema, Document, Types } from "mongoose";

export type OrganizationRole =
  | "admin"
  | "beekeeper"
  | "processor"
  | "lab"
  | "transporter"
  | "auditor";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  role: OrganizationRole;
  walletAddress: string;
  isActive: boolean;
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
      enum: ["admin", "beekeeper", "processor", "lab", "transporter", "auditor"],
      required: [true, "Organization role/type is required"],
      index: true,
    },
    walletAddress: {
      type: String,
      required: [true, "Wallet address is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model<IOrganization>("Organization", OrganizationSchema);
export default Organization;
