// src/services/apiary.service.ts
import api from "@/lib/axios";
import type {
  Apiary,
  CreateApiaryPayload,
  UpdateApiaryPayload,
} from "@/types/apiary";

export interface ApiaryListResponse {
  success: boolean;
  data: Apiary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const apiaryService = {
  async getAll(params?: {
    status?: string;
    region?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiaryListResponse> {
    const response = await api.get<ApiaryListResponse>("/api/apiaries", {
      params,
    });
    return response.data;
  },

  async getById(id: string): Promise<{ success: boolean; data: Apiary }> {
    const response = await api.get<{ success: boolean; data: Apiary }>(
      `/api/apiaries/${encodeURIComponent(id)}`
    );
    return response.data;
  },

  async create(
    data: CreateApiaryPayload
  ): Promise<{ success: boolean; message: string; data: Apiary }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Apiary;
    }>("/api/apiaries", data);
    return response.data;
  },

  async update(
    id: string,
    data: UpdateApiaryPayload
  ): Promise<{ success: boolean; message: string; data: Apiary }> {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: Apiary;
    }>(`/api/apiaries/${encodeURIComponent(id)}`, data);
    return response.data;
  },
};
