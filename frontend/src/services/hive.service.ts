// src/services/hive.service.ts
import api from "@/lib/axios";
import type {
  Hive,
  CreateHivePayload,
  UpdateHivePayload,
  HiveListResponse,
} from "@/types/hive";

export const hiveService = {
  async getAll(params?: {
    apiaryId?: string;
    status?: string;
    healthStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<HiveListResponse> {
    const response = await api.get<HiveListResponse>("/api/hives", { params });
    return response.data;
  },

  async getById(hiveId: string): Promise<{ success: boolean; data: Hive }> {
    const response = await api.get<{ success: boolean; data: Hive }>(
      `/api/hives/${encodeURIComponent(hiveId)}`
    );
    return response.data;
  },

  async create(
    data: CreateHivePayload
  ): Promise<{ success: boolean; message: string; data: Hive }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Hive;
    }>("/api/hives", data);
    return response.data;
  },

  async update(
    hiveId: string,
    data: UpdateHivePayload
  ): Promise<{ success: boolean; message: string; data: Hive }> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: Hive;
    }>(`/api/hives/${encodeURIComponent(hiveId)}`, data);
    return response.data;
  },

  async delete(
    hiveId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/hives/${encodeURIComponent(hiveId)}`
    );
    return response.data;
  },
};