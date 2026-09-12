// src/services/batch.service.ts
import api from "@/lib/axios";
import type {
  BatchItem,
  BatchListResponse,
  CreateBatchPayload,
  DeliverBatchPayload,
  TransferBatchPayload,
  UploadCertificateResponse,
} from "@/types/batch";

export const batchService = {
  async getAll(params?: {
    status?: string;
    producer?: string;
    currentCustodian?: string;
    organizationId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<BatchListResponse> {
    const response = await api.get<BatchListResponse>("/api/batches", {
      params,
    });
    return response.data;
  },

  async getById(batchId: string): Promise<{ success: boolean; data: BatchItem }> {
    const response = await api.get<{ success: boolean; data: BatchItem }>(
      `/api/batches/${encodeURIComponent(batchId)}`
    );
    return response.data;
  },

  async create(
    data: CreateBatchPayload
  ): Promise<{ success: boolean; message: string; data: BatchItem }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: BatchItem;
    }>("/api/batches", data);
    return response.data;
  },

  async generateQR(batchId: string): Promise<{
    success: boolean;
    batchId: string;
    verificationUrl: string;
    dataUrl: string;
    svg: string;
  }> {
    const response = await api.get(
      `/api/batches/${encodeURIComponent(batchId)}/qr`
    );
    return response.data;
  },

  async transfer(
    batchId: string,
    data: TransferBatchPayload
  ): Promise<{ success: boolean; message: string; data: BatchItem }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: BatchItem;
    }>(`/api/batches/${encodeURIComponent(batchId)}/transfer`, data);
    return response.data;
  },

  async deliver(
    batchId: string,
    data: DeliverBatchPayload
  ): Promise<{ success: boolean; message: string; data: BatchItem }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: BatchItem;
    }>(`/api/batches/${encodeURIComponent(batchId)}/deliver`, data);
    return response.data;
  },

  async uploadCertificate(
    batchId: string,
    data: { fileName: string; fileData: string }
  ): Promise<UploadCertificateResponse> {
    const response = await api.post<UploadCertificateResponse>(
      `/api/batches/${encodeURIComponent(batchId)}/certificate`,
      data
    );
    return response.data;
  },

  async recall(
    batchId: string,
    data: {
      reason: string;
      role?: "auditor" | "admin";
    }
  ): Promise<{ success: boolean; message: string; data: BatchItem }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: BatchItem;
    }>(`/api/batches/${encodeURIComponent(batchId)}/recall`, data);
    return response.data;
  },
};