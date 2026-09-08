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