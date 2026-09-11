import mongoose, { Schema, Document, Types } from "mongoose";

export type AlertSeverity = "info" | "warning" | "critical";

export interface IAlert extends Document {
  hiveId: string;
  apiaryId?: string;
  organizationId?: Types.ObjectId;
  severity: AlertSeverity;
  alertType: string;
  message: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    hiveId: {
      type: String,
      required: [true, "hiveId is required"],
      trim: true,
      index: true,
    },
    apiaryId: {
      type: String,
      trim: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
      index: true,
    },
    alertType: {
      type: String,
      required: [true, "alertType is required"],
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: [true, "message is required"],
      trim: true,
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

// Optimize queries for active alerts per hive, organization, and deduplication lookups
AlertSchema.index({ hiveId: 1, alertType: 1, isResolved: 1, createdAt: -1 });
AlertSchema.index({ organizationId: 1, isResolved: 1, createdAt: -1 });
AlertSchema.index({ createdAt: -1 });

export const Alert = mongoose.model<IAlert>("Alert", AlertSchema);
export default Alert;
