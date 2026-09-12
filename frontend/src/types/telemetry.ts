// src/types/telemetry.ts

export interface Telemetry {
  deviceId: string;
  hiveId: string;
  timestamp: string | number;
  temperature: number;
  humidity: number;
  weightKg: number;
  batteryLevelPct: number;
  soundFrequencyHz?: number;
  acousticsDb?: number;
  ambientTemperature?: number;
  ambientHumidity?: number;
  flow?: number;
  beeInCount?: number;
  beeOutCount?: number;
  metadata?: Record<string, unknown>;
}

export interface TelemetryResponse {
  success: boolean;
  message?: string;
  data?: Telemetry;
}

export interface TelemetryHistoryPoint {
  id?: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  weightKg: number;
  soundFrequencyHz?: number;
  acousticsDb?: number;
  batteryLevelPct?: number;
  flow?: number;
  beeInCount?: number;
  beeOutCount?: number;
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