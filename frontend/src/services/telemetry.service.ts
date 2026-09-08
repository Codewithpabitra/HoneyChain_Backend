import api from "@/lib/axios";
import type { Telemetry, TelemetryResponse } from "@/types/telemetry";

export interface SimulationResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export const telemetryService = {
  async create(data: Telemetry): Promise<TelemetryResponse> {
    const response = await api.post<TelemetryResponse>(
      "/api/iot/telemetry",
      data,
    );

    return response.data;
  },

  async simulate(): Promise<SimulationResponse> {
    const response = await api.post<SimulationResponse>(
      "/api/iot/simulate",
    );

    return response.data;
  },
};