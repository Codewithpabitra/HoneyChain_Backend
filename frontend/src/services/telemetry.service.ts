// src/services/telemetry.service.ts
import api from "@/lib/axios";
import type {
  Telemetry,
  TelemetryResponse,
  TelemetryHistoryResponse,
  DeviceStatusResponse,
} from "@/types/telemetry";

export interface SimulationResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export const telemetryService = {
  async create(data: Telemetry): Promise<TelemetryResponse> {
    const response = await api.post<TelemetryResponse>(
      "/api/iot/telemetry",
      data
    );
    return response.data;
  },

  async getHistory(
    hiveId: string,
    params?: {
      from?: string;
      to?: string;
      limit?: number;
      resolution?: "raw" | "hourly";
    }
  ): Promise<TelemetryHistoryResponse> {
    const response = await api.get<TelemetryHistoryResponse>(
      `/api/iot/telemetry/${encodeURIComponent(hiveId)}`,
      { params }
    );
    return response.data;
  },

  async getDeviceStatus(deviceId: string): Promise<DeviceStatusResponse> {
    const response = await api.get<DeviceStatusResponse>(
      `/api/iot/devices/${encodeURIComponent(deviceId)}/status`
    );
    return response.data;
  },

  async simulate(): Promise<SimulationResponse> {
    const response = await api.post<SimulationResponse>("/api/iot/simulate");
    return response.data;
  },
};