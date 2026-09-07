import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISensorReading extends Document {
  hiveId: string;
  hive?: Types.ObjectId;
  deviceId: string;
  timestamp: Date;

  // In-hive Core Telemetry
  temperature: number; // Brood nest temperature in Celsius (e.g. 34.5°C)
  humidity: number; // Internal relative humidity percentage (e.g. 58.0%)
  weightKg: number; // Hive total weight in kg (e.g. 32.4 kg)

  // Bee Activity & Flow Telemetry (for ML colony health & swarming inference)
  flow?: number; // Net bee flow (count_in - count_out)
  beeInCount?: number; // Bees entering hive
  beeOutCount?: number; // Bees exiting hive

  // Acoustic & Vibration Telemetry (crucial for swarming/queenless detection)
  soundFrequencyHz?: number; // Dominant acoustic frequency in Hz (e.g. 220-250 Hz)
  acousticsDb?: number; // Acoustic amplitude in decibels (e.g. 62 dB)

  // Power & Connectivity
  batteryLevelPct?: number; // Device battery percentage (0-100)

  // Ambient Environment (optional readings from apiary weather station or outdoor sensor)
  ambientTemperature?: number;
  ambientHumidity?: number;

  // Extensible payload for LoRaWAN RF metrics, gateway info, or raw packet telemetry
  metadata?: Record<string, any>;

  createdAt: Date;
}

const SensorReadingSchema = new Schema<ISensorReading>(
  {
    hiveId: {
      type: String,
      required: [true, "hiveId is required"],
      trim: true,
      index: true,
    },
    hive: {
      type: Schema.Types.ObjectId,
      ref: "Hive",
      required: false,
      index: true,
    },
    deviceId: {
      type: String,
      required: [true, "deviceId is required"],
      trim: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: [true, "timestamp is required"],
      default: Date.now,
      index: true,
    },
    temperature: {
      type: Number,
      required: [true, "In-hive temperature is required"],
    },
    humidity: {
      type: Number,
      required: [true, "In-hive humidity is required"],
      min: [0, "Humidity cannot be less than 0%"],
      max: [100, "Humidity cannot exceed 100%"],
    },
    weightKg: {
      type: Number,
      required: [true, "Hive weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    flow: {
      type: Number,
    },
    beeInCount: {
      type: Number,
      min: [0, "Bee in count cannot be negative"],
    },
    beeOutCount: {
      type: Number,
      min: [0, "Bee out count cannot be negative"],
    },
    soundFrequencyHz: {
      type: Number,
      min: [0, "Sound frequency cannot be negative"],
    },
    acousticsDb: {
      type: Number,
      min: [0, "Acoustic dB cannot be negative"],
    },
    batteryLevelPct: {
      type: Number,
      min: [0, "Battery level must be >= 0"],
      max: [100, "Battery level must be <= 100"],
    },
    ambientTemperature: {
      type: Number,
    },
    ambientHumidity: {
      type: Number,
      min: 0,
      max: 100,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Time-series readings are immutable write-once
  }
);

/**
 * Highly Optimized Compound Indexes for IoT Workloads:
 * 1. { hiveId: 1, timestamp: -1 }: Enables O(log N) fetch for latest hive reading AND bounded time-range queries.
 * 2. { deviceId: 1, timestamp: -1 }: Enables device diagnostic queries and telemetry monitoring.
 * 3. { timestamp: -1 }: Enables global chronological sorting and system-wide telemetry aggregation.
 */
SensorReadingSchema.index({ hiveId: 1, timestamp: -1 });
SensorReadingSchema.index({ deviceId: 1, timestamp: -1 });
SensorReadingSchema.index({ timestamp: -1 });
SensorReadingSchema.index({ deviceId: 1, timestamp: 1 }, { unique: true });

export const SensorReading = mongoose.model<ISensorReading>(
  "SensorReading",
  SensorReadingSchema
);
export default SensorReading;
