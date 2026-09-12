import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQueenInfo {
  queenId?: string;
  installedDate?: Date;
  markedColor?: "White" | "Yellow" | "Red" | "Green" | "Blue" | "None";
  isMated?: boolean;
  notes?: string;
}

export interface IDeviceMetadata {
  deviceId: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  communicationProtocol?: "MQTT" | "LoRaWAN" | "HTTP" | "BLE";
  lastPingAt?: Date;
  batteryLevelPct?: number;
}

export interface IHiveLocation {
  latitude: number;
  longitude: number;
  address?: string;
  isApproximate?: boolean;
}

export interface ILatestGeminiAnalysis {
  triggered: boolean;
  triggerReason?: string;
  severity?: "low" | "medium" | "high" | "critical";
  summary?: string;
  recommendedAction?: string;
  urgency?: "low" | "medium" | "high" | "immediate";
  generatedAt?: Date;
}

export interface ICurrentHealthSummary {
  healthScore?: number; // 0 to 100
  status: "healthy" | "warning" | "critical" | "unknown";
  stressIndex?: number; // 0 to 1
  latestInspectionDate?: Date;
  latestReadingAt?: Date;
  activeAlerts?: string[];
  lastAIPredictionId?: string;
  latestGeminiAnalysis?: ILatestGeminiAnalysis;
}

export interface IHive extends Document {
  hiveId: string;
  apiary: Types.ObjectId; // Reference to Apiary document
  apiaryId: string; // Redundant string identifier for fast querying
  beekeeper: string; // Owner / beekeeper reference
  hiveType: "Langstroth" | "Top-Bar" | "Warre" | "Traditional-Box" | "Smart-IoT-Box";
  beeSpecies: string;
  queenInfo?: IQueenInfo;
  installationDate: Date;
  status: "active" | "inactive" | "swarmed" | "collapsed" | "quarantined";
  location?: IHiveLocation;
  deviceMetadata?: IDeviceMetadata;
  currentHealthSummary?: ICurrentHealthSummary;
  organizationId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QueenInfoSchema = new Schema<IQueenInfo>(
  {
    queenId: { type: String, trim: true },
    installedDate: { type: Date },
    markedColor: {
      type: String,
      enum: ["White", "Yellow", "Red", "Green", "Blue", "None"],
      default: "None",
    },
    isMated: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const DeviceMetadataSchema = new Schema<IDeviceMetadata>(
  {
    deviceId: {
      type: String,
      required: [true, "deviceId is required when device metadata is present"],
      trim: true,
    },
    hardwareModel: { type: String, default: "ESP32-WROOM-32U + Sensors" },
    firmwareVersion: { type: String, default: "v1.0.0" },
    communicationProtocol: {
      type: String,
      enum: ["MQTT", "LoRaWAN", "HTTP", "BLE"],
      default: "MQTT",
    },
    lastPingAt: { type: Date },
    batteryLevelPct: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const CurrentHealthSummarySchema = new Schema<ICurrentHealthSummary>(
  {
    healthScore: { type: Number, min: 0, max: 100, default: 100 },
    status: {
      type: String,
      enum: ["healthy", "warning", "critical", "unknown"],
      default: "unknown",
      index: true,
    },
    stressIndex: { type: Number, min: 0, max: 1, default: 0 },
    latestInspectionDate: { type: Date },
    latestReadingAt: { type: Date },
    activeAlerts: { type: [String], default: [] },
    lastAIPredictionId: { type: String },
    latestGeminiAnalysis: {
      triggered: { type: Boolean, default: false },
      triggerReason: { type: String },
      severity: { type: String, enum: ["low", "medium", "high", "critical"] },
      summary: { type: String },
      recommendedAction: { type: String },
      urgency: { type: String, enum: ["low", "medium", "high", "immediate"] },
      generatedAt: { type: Date },
    },
  },
  { _id: false }
);

const HiveLocationSchema = new Schema<IHiveLocation>(
  {
    latitude: {
      type: Number,
      min: [-90, "Latitude cannot be less than -90"],
      max: [90, "Latitude cannot exceed 90"],
    },
    longitude: {
      type: Number,
      min: [-180, "Longitude cannot be less than -180"],
      max: [180, "Longitude cannot exceed 180"],
    },
    address: { type: String, trim: true },
    isApproximate: { type: Boolean, default: true },
  },
  { _id: false }
);

const HiveSchema = new Schema<IHive>(
  {
    hiveId: {
      type: String,
      required: [true, "hiveId is required"],
      unique: true,
      trim: true,
      index: true,
    },
    apiary: {
      type: Schema.Types.ObjectId,
      ref: "Apiary",
      required: [true, "Apiary reference is required"],
      index: true,
    },
    apiaryId: {
      type: String,
      required: [true, "apiaryId string identifier is required"],
      trim: true,
      index: true,
    },
    beekeeper: {
      type: String,
      required: [true, "Beekeeper reference is required"],
      trim: true,
      index: true,
    },
    hiveType: {
      type: String,
      enum: ["Langstroth", "Top-Bar", "Warre", "Traditional-Box", "Smart-IoT-Box"],
      default: "Langstroth",
    },
    beeSpecies: {
      type: String,
      default: "Apis cerana indica",
      trim: true,
    },
    queenInfo: {
      type: QueenInfoSchema,
    },
    installationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "swarmed", "collapsed", "quarantined"],
      default: "active",
      index: true,
    },
    location: {
      type: HiveLocationSchema,
      required: false,
    },
    deviceMetadata: {
      type: DeviceMetadataSchema,
    },
    currentHealthSummary: {
      type: CurrentHealthSummarySchema,
      default: () => ({ status: "unknown", healthScore: 100, stressIndex: 0 }),
    },
    notes: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast querying
HiveSchema.index({ apiary: 1, status: 1 });
HiveSchema.index({ apiaryId: 1, status: 1 });
HiveSchema.index({ beekeeper: 1, status: 1 });
HiveSchema.index({ "deviceMetadata.deviceId": 1 });

export const Hive = mongoose.model<IHive>("Hive", HiveSchema);
export default Hive;
