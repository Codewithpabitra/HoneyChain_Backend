// src/services/alert.service.ts
import api from "@/lib/axios";
import type { Alert, AlertFilter, AlertListResponse } from "@/types/alert";

export const alertService = {
  async getAlerts(params?: AlertFilter): Promise<AlertListResponse> {
    const response = await api.get<AlertListResponse>("/api/alerts", {
      params,
    });
    return response.data;
  },

  async resolveAlert(
    id: string
  ): Promise<{ success: boolean; message: string; data: Alert }> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: Alert;
    }>(`/api/alerts/${encodeURIComponent(id)}/resolve`);
    return response.data;
  },
};
