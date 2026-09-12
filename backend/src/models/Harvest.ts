import mongoose, { Schema, Document, Types } from "mongoose";

export interface IHarvest extends Document {
  harvestId: string;
  hiveId: string;
  apiaryId?: string;
  beekeeperId: string;
  organizationId?: Types.ObjectId;
  quantityGrams: number;
  harvestTimestamp: number;
  floralOrigin?: string;
  batchId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HarvestSchema = new Schema<IHarvest>(
  {
    harvestId: {
      type: String,
      required: [true, "harvestId is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
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
    beekeeperId: {
      type: String,
      required: [true, "beekeeperId is required"],
      trim: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    quantityGrams: {
      type: Number,
      required: [true, "quantityGrams is required"],
      min: [1, "quantityGrams must be positive"],
    },
    harvestTimestamp: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },
    floralOrigin: {
      type: String,
      trim: true,
    },
    batchId: {
      type: String,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

HarvestSchema.index({ organizationId: 1, harvestTimestamp: -1 });
HarvestSchema.index({ hiveId: 1, harvestTimestamp: -1 });

export const Harvest = mongoose.model<IHarvest>("Harvest", HarvestSchema);
export default Harvest;
