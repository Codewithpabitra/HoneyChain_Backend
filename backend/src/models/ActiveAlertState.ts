import mongoose, { Schema, Document } from "mongoose";

/**
 * ActiveAlertState — persisted per-hive/sensor/alertType alert condition state.
 *
 * Tracks whether a particular abnormal condition is CURRENTLY active for a given
 * hive+sensor+alertType combination. This enables stateful SMS anti-spam:
 *
 *   - NEW abnormal    → isActive: false → save isActive: true  → send SMS
 *   - CONTINUING      → isActive: true  → no SMS
 *   - RECOVERY        → set isActive: false
 *   - NEW after rec.  → isActive: false → save isActive: true  → send SMS
 *
 * Persisted in MongoDB so state survives backend restarts.
 */
export interface IActiveAlertState extends Document {
  /** Unique per hive+alertType, e.g. "HIVE-SB-101:temperature_abnormal_high" */
  stateKey: string;
  hiveId: string;
  deviceId: string;
  /** alertType mirrors the Alert model type string, e.g. "abnormal_temperature" */
  alertType: string;
  /** sensor name e.g. "temperature", "humidity", "weight" */
  sensorName: string;
  /** true = condition is currently active/ongoing */
  isActive: boolean;
  /** when the condition first triggered (for informational/audit use) */
  activeSince?: Date;
  /** when the condition last recovered to normal */
  recoveredAt?: Date;
  /** timestamp of last SMS sent for this condition */
  lastSmsSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActiveAlertStateSchema = new Schema<IActiveAlertState>(
  {
    stateKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    hiveId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    alertType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sensorName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    activeSince: {
      type: Date,
    },
    recoveredAt: {
      type: Date,
    },
    lastSmsSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Fast lookup index for state transitions
ActiveAlertStateSchema.index({ hiveId: 1, alertType: 1 });

export const ActiveAlertState = mongoose.model<IActiveAlertState>(
  "ActiveAlertState",
  ActiveAlertStateSchema
);
export default ActiveAlertState;
