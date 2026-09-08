import api from "@/lib/axios";
import type { CreateQualityPayload, QualityTest } from "@/types/quality";

export const qualityService = {
  async create(
    batchId: string,
    data: CreateQualityPayload,
  ): Promise<QualityTest> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: QualityTest;
    }>(
      `/api/batches/${encodeURIComponent(batchId)}/quality`,
      data,
    );

    return response.data.data;
  },
};