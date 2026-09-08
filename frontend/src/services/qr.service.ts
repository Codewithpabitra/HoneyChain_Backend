import api from "@/lib/axios";
import type { BatchQRResponse } from "@/types/qr";

export const qrService = {
  async getBatchQR(batchId: string): Promise<BatchQRResponse> {
    const response = await api.get<BatchQRResponse>(
      `/batches/${encodeURIComponent(batchId)}/qr`,
    );

    return response.data;
  },
};