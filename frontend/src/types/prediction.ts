export type PredictionStatus =
  | "HEALTHY"
  | "VARROA_STRESS"
  | "SWARMING_RISK"
  | "QUEEN_ABSENT"
  | "FEEDING_REQUIRED"
  | "COLD_STRESS";

export interface PredictionMetrics {
  temperature: number;
  humidity: number;
  weightKg: number;
  soundFrequencyHz?: number;
  beeFlow?: number;
}

export interface Prediction {
  hiveId: string;
  tier: string;
  status: PredictionStatus;
  confidence: number;
  healthScore?: number;
  anomalyDetected?: boolean;
  anomaliesDetected: string[];
  alerts: string[];
  recommendations: string[];
  drivers?: any[];
  metricsSnapshot: PredictionMetrics;
  timestamp: number;
}

export interface ModelOutput {
  rawPrediction: unknown;
  probabilities: Record<string, number>;
  tierUsed: string;
  featuresExtracted: Record<string, unknown>;
}

export interface MLPredictionResponse {
  success: boolean;
  status: "OK";
  data: {
    prediction: Prediction;
    modelOutput: ModelOutput;
  };
}

export interface HistoricalPrediction {
  _id: string;
  hiveId: string;
  tier: string;
  status: PredictionStatus;
  confidence: number;
  metricsSnapshot: PredictionMetrics;
  createdAt: string;
}

export interface HistoricalPredictionsResponse {
  success: boolean;
  data: {
    hiveId: string;
    predictions: HistoricalPrediction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface LatestPredictionResponse {
  success: boolean;
  data: Prediction & {
    _id: string;
    createdAt: string;
  };
}