import mongoose, { Schema, Document, Types } from "mongoose";
import { OrganizationRole, OrganizationType } from "./Organization.js";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IApplicationDocument {
  name: string;
  url: string;
  fileType?: string;
  uploadedAt?: Date;
}

export interface IOrganizationApplication extends Document {
  _id: Types.ObjectId;
  applicationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  role?: OrganizationRole;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  adminName: string;
  adminEmail: string;
  documents: IApplicationDocument[];
  status: ApplicationStatus;
  rejectionReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  organizationId?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationDocumentSchema = new Schema<IApplicationDocument>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    fileType: { type: String, default: "application/pdf" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrganizationApplicationSchema = new Schema<IOrganizationApplication>(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    organizationType: {
      type: String,
      enum: ["beekeeper", "processor", "lab", "transporter", "auditor"],
      required: [true, "Valid organization type is required"],
      index: true,
    },
    role: {
      type: String,
      enum: ["beekeeper", "processor", "lab", "transporter", "auditor"],
      index: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    adminName: {
      type: String,
      required: [true, "Initial Organization Admin name is required"],
      trim: true,
    },
    adminEmail: {
      type: String,
      required: [true, "Initial Organization Admin email is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    documents: {
      type: [ApplicationDocumentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
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
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const OrganizationApplication = mongoose.model<IOrganizationApplication>(
  "OrganizationApplication",
  OrganizationApplicationSchema
);
export default OrganizationApplication;
