// src/services/analytics.service.ts
import api from "@/lib/axios";
import type { DashboardStats, ClustersResponse } from "@/types/analytics";

export const analyticsService = {
  async getDashboardStats(): Promise<{
    success: boolean;
    data: DashboardStats;
  }> {
    const response = await api.get<{
      success: boolean;
      data: DashboardStats;
    }>("/api/analytics/dashboard");
    return response.data;
  },

  async getClusters(): Promise<ClustersResponse> {
    const response = await api.get<ClustersResponse>("/api/analytics/clusters");
    return response.data;
  },
};
