import api from "@/lib/axios";
import type {
  HistoricalPredictionsResponse,
  LatestPredictionResponse,
  MLPredictionResponse,
} from "@/types/prediction";

export const mlService = {
  async predict(
    hiveId: string,
    options: { forceAi?: boolean } = { forceAi: true }
  ): Promise<MLPredictionResponse> {
    const response = await api.post<MLPredictionResponse>(
      `/api/ml/predict/${encodeURIComponent(hiveId)}`,
      {},
      {
        params: {
          forceAi: options.forceAi ?? true,
        },
      }
    );

    return response.data;
  },

  async getHistory(
    hiveId: string,
    page = 1,
    limit = 10,
  ): Promise<HistoricalPredictionsResponse> {
    const response = await api.get<HistoricalPredictionsResponse>(
      `/api/ml/predictions/${encodeURIComponent(hiveId)}`,
      {
        params: { page, limit },
      },
    );

    return response.data;
  },

  async getLatest(hiveId: string): Promise<LatestPredictionResponse> {
    const response = await api.get<LatestPredictionResponse>(
      `/api/ml/latest/${encodeURIComponent(hiveId)}`,
    );

    return response.data;
  },

  async health() {
    return api.get("/api/ml/health");
  },
};