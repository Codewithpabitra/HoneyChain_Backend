import api from "@/lib/axios";
import type { BatchVerification } from "@/types/batch";

export const verificationService = {
  async verifyBatch(batchId: string): Promise<BatchVerification> {
    const response = await api.get<BatchVerification>(
      `/api/verify/${encodeURIComponent(batchId)}`,
    );

    return response.data;
  },
};