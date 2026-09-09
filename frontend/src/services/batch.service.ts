import api from "@/lib/axios";
import type { CreateBatchPayload } from "@/types/batch";

export const batchService = {
  async create(data: CreateBatchPayload) {
    const response = await api.post("/api/batches", data);
    return response.data;
  },

  async generateQR(batchId: string) {
    const response = await api.get(`/api/batches/${encodeURIComponent(batchId)}/qr`);
    return response.data;
  },

  async transfer(
    batchId: string,
    data: {
      to: string;
      location: string;
      role?: "beekeeper" | "processor" | "distributor";
    },
  ) {
    const response = await api.post(
      `/api/batches/${encodeURIComponent(batchId)}/transfer`,
      data,
    );
    return response.data;
  },

  async recall(
    batchId: string,
    data: {
      reason: string;
      role?: "auditor" | "admin";
    },
  ) {
    const response = await api.post(
      `/api/batches/${encodeURIComponent(batchId)}/recall`,
      data,
    );
    return response.data;
  },
};