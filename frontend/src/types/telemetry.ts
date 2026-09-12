// src/types/telemetry.ts

export interface Telemetry {
  deviceId: string;
  hiveId: string;
  timestamp: string | number;
  temperature: number;
  humidity: number;
  weightKg: number;
  batteryLevelPct: number;
  beeInCount?: number;
  beeOutCount?: number;
  flow?: number;
  metadata?: Record<string, unknown>;
  // Deprecated redundant fields
  soundFrequencyHz?: number;
  acousticsDb?: number;
  ambientTemperature?: number;
  ambientHumidity?: number;
}

export interface TelemetryResponse {
  success: boolean;
  message?: string;
  data?: Telemetry;
}

export interface TelemetryHistoryPoint {
  id?: string;
  deviceId?: string;
  hiveId?: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  weightKg: number;
  batteryLevelPct?: number;
  beeInCount?: number;
  beeOutCount?: number;
  flow?: number;
  // Deprecated redundant fields
  soundFrequencyHz?: number;
  acousticsDb?: number;
  ambientTemperature?: number;
  ambientHumidity?: number;
}

export interface TelemetryHistoryResponse {
  success: boolean;
  hiveId: string;
  resolution: "raw" | "hourly";
  count: number;
  data: TelemetryHistoryPoint[];
}

export interface TelemetryRecentResponse {
  success: boolean;
  hiveId: string;
  source: "redis" | "mongodb-fallback";
  count: number;
  data: TelemetryHistoryPoint[];
}

export interface DeviceStatusResponse {
  success: boolean;
  data: {
    deviceId: string;
    hiveId?: string;
    isOnline: boolean;
    status: "online" | "offline";
    lastPingAt?: string;
    batteryLevelPct: number | null;
    hardwareModel: string;
    firmwareVersion: string;
    latestReading?: {
      timestamp: string;
      temperature: number;
      humidity: number;
      weightKg: number;
      batteryLevelPct: number;
    } | null;
  };
}