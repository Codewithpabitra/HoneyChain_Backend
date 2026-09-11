// src/services/harvest.service.ts
import api from "@/lib/axios";
import type {
  Harvest,
  CreateHarvestPayload,
  HarvestListResponse,
} from "@/types/harvest";

export const harvestService = {
  async getAll(params?: {
    hiveId?: string;
    batchId?: string;
    floralOrigin?: string;
    page?: number;
    limit?: number;
  }): Promise<HarvestListResponse> {
    const response = await api.get<HarvestListResponse>("/api/harvests", {
      params,
    });
    return response.data;
  },

  async getById(
    harvestId: string
  ): Promise<{ success: boolean; data: Harvest }> {
    const response = await api.get<{ success: boolean; data: Harvest }>(
      `/api/harvests/${encodeURIComponent(harvestId)}`
    );
    return response.data;
  },

  async create(
    data: CreateHarvestPayload
  ): Promise<{ success: boolean; message: string; data: Harvest }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Harvest;
    }>("/api/harvests", data);
    return response.data;
  },
};