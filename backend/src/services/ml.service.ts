import { env } from "../config/env.js";
import { SensorReading, Hive, AIPrediction } from "../models/index.js";
import alertService from "./alert.service.js";
import AppError from "../utils/AppError.js";

export interface MLModelReadingInput {
  timestamp: string;
  temperature: number | string;
  humidity: number | string;
  weight: number | string;
  flow: number | string;
}

export interface MLServiceHealth {
  healthy: boolean;
  modelLoaded: boolean;
  tiers: string[];
  serviceUrl: string;
  error?: string;
}

export class MLService {
  private serviceUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor() {
    this.serviceUrl = env.ML_SERVICE_URL || "http://localhost:5001";
    this.apiKey = env.ML_API_KEY && env.ML_API_KEY.trim() ? env.ML_API_KEY.trim() : undefined;
    this.timeoutMs = parseInt(env.ML_TIMEOUT_MS || "10000", 10) || 10000;
  }

  /**
   * Helper to attach optional X-ML-API-Key header for server-to-server security.
   */
  private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (this.apiKey) {
      headers["X-ML-API-Key"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Formats a UTC Date object into a local time string (YYYY-MM-DD HH:mm:ss).
   * Default offset is +330 minutes (UTC+05:30 Indian Standard Time).
   * The ML seasonal baseline requires local time at the hive to properly compute
   * circadian daylight features and day-of-year baseline deviation.
   */
  public formatLocalHiveTime(date: Date, offsetMinutes: number = 330): string {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
    const localMs = utcMs + offsetMinutes * 60000;
    const localDate = new Date(localMs);

    const pad = (n: number) => String(n).padStart(2, "0");
    const year = localDate.getFullYear();
    const month = pad(localDate.getMonth() + 1);
    const day = pad(localDate.getDate());
    const hours = pad(localDate.getHours());
    const minutes = pad(localDate.getMinutes());
    const seconds = pad(localDate.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Transforms MongoDB SensorReading documents into the exact input schema expected by predict.py:
   * - timestamp: string (local time)
   * - temperature: float (°C, ambient air)
   * - humidity: float (% RH)
   * - weight: float (kg)
   * - flow: signed integer (bees entering - bees leaving)
   */
  public prepareModelInput(
    readings: any[],
    offsetMinutes: number = 330
  ): MLModelReadingInput[] {
    return readings.map((r) => {
      const dateObj = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
      const timestampStr = this.formatLocalHiveTime(dateObj, offsetMinutes);

      // Temperature: prefer ambient if available, fallback to in-hive temperature
      const temp = r.ambientTemperature !== undefined && r.ambientTemperature !== null
        ? Number(r.ambientTemperature)
        : Number(r.temperature);

      // Humidity: prefer ambient if available, fallback to in-hive humidity
      const hum = r.ambientHumidity !== undefined && r.ambientHumidity !== null
        ? Number(r.ambientHumidity)
        : Number(r.humidity);

      // Weight: in kg
      const wt = Number(r.weightKg ?? r.weight ?? 0);

      // Flow: net bee flow (count_in - count_out). Never averaged.
      let flowVal = 0;
      if (typeof r.flow === "number") {
        flowVal = r.flow;
      } else if (
        typeof r.beeInCount === "number" &&
        typeof r.beeOutCount === "number"
      ) {
        flowVal = r.beeInCount - r.beeOutCount;
      } else if (r.metadata && typeof r.metadata.flow === "number") {
        flowVal = r.metadata.flow;
      } else if (r.metadata && typeof r.metadata.netFlow === "number") {
        flowVal = r.metadata.netFlow;
      }

      return {
        timestamp: timestampStr,
        temperature: isNaN(temp) ? "nan" : temp,
        humidity: isNaN(hum) ? "nan" : hum,
        weight: isNaN(wt) ? "nan" : wt,
        flow: Math.round(flowVal),
      };
    });
  }

  /**
   * Checks the health and availability of the independent Python ML microservice over HTTP.
   */
  public async checkHealth(): Promise<MLServiceHealth> {
    try {
      const res = await fetch(`${this.serviceUrl}/health`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.ok) {
        const body = (await res.json()) as any;
        return {
          healthy: true,
          modelLoaded: body.modelLoaded === true,
          tiers: body.tiers || [],
          serviceUrl: this.serviceUrl,
        };
      }
      return {
        healthy: false,
        modelLoaded: false,
        tiers: [],
        serviceUrl: this.serviceUrl,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    } catch (err: any) {
      return {
        healthy: false,
        modelLoaded: false,
        tiers: [],
        serviceUrl: this.serviceUrl,
        error: err.message || "Connection refused",
      };
    }
  }

  /**
   * Executes inference for a specific hive using historical sensor readings from MongoDB.
   * Calls the independent Python ML microservice via HTTP/HTTPS.
   * Persists the prediction into MongoDB AIPrediction and updates Hive health summary.
   */
  public async predictForHive(
    hiveId: string,
    options: { persist?: boolean; offsetMinutes?: number } = {}
  ): Promise<{
    success: boolean;
    status: string;
    message?: string;
    prediction?: any;
    modelOutput?: any;
  }> {
    const { persist = true, offsetMinutes = 330 } = options;
    const cleanHiveId = hiveId.trim();

    // 1. Verify hive exists in registry
    const hive = await Hive.findOne({ hiveId: cleanHiveId });
    if (!hive) {
      throw new AppError(`Hive '${cleanHiveId}' not found in registry`, 404);
    }

    // 2. Fetch chronological telemetry history (up to 72 hours of readings)
    const readings = await SensorReading.find({ hiveId: cleanHiveId })
      .sort({ timestamp: 1 })
      .limit(2000)
      .lean();

    if (readings.length === 0) {
      return {
        success: false,
        status: "INSUFFICIENT_DATA",
        message: `No sensor telemetry available for hive '${cleanHiveId}'. At least 1 reading is required for T1 analysis.`,
      };
    }

    // 3. Transform readings to model input contract
    const modelInput = this.prepareModelInput(readings, offsetMinutes);

    // 4. Call independent ML inference microservice
    let modelOutput: any;
    try {
      const res = await fetch(`${this.serviceUrl}/predict`, {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ hiveId: cleanHiveId, readings: modelInput }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        if (res.status === 401) {
          return {
            success: false,
            status: "UNAUTHORIZED",
            message: "ML microservice authentication failed (invalid or missing X-ML-API-Key)",
          };
        }
        const errorBody = (await res.json().catch(() => ({}))) as any;
        return {
          success: false,
          status: errorBody.status || "INFERENCE_ERROR",
          message: errorBody.message || `ML microservice responded with HTTP ${res.status}`,
        };
      }

      modelOutput = await res.json();
    } catch (err: any) {
      const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");
      return {
        success: false,
        status: isTimeout ? "SERVICE_TIMEOUT" : "SERVICE_UNAVAILABLE",
        message: isTimeout
          ? `Timeout communicating with ML microservice after ${this.timeoutMs}ms`
          : `Failed to reach ML microservice at ${this.serviceUrl}: ${err.message || "Connection refused"}`,
      };
    }

    // 5. Handle model-level non-OK statuses (e.g. INCOMPLETE_FEATURES, NO_DATA)
    if (modelOutput.status !== "OK") {
      return {
        success: false,
        status: modelOutput.status || "INSUFFICIENT_DATA",
        message: modelOutput.message || "Model could not calculate health score from available features.",
        modelOutput,
      };
    }

    // 6. Persist prediction into MongoDB AIPrediction
    let savedPrediction: any = null;
    if (persist) {
      const predictionId = `PRED-ML-${cleanHiveId}-${Date.now()}`;
      const firstTimestamp = readings[0].timestamp;
      const lastTimestamp = readings[readings.length - 1].timestamp;

      // Map stress risk to internal status
      let mappedStatus: "normal" | "warning" | "critical" = "normal";
      if (modelOutput.stressRisk === "HIGH") {
        mappedStatus = "critical";
      } else if (modelOutput.stressRisk === "MEDIUM") {
        mappedStatus = "warning";
      }

      const newPrediction = new AIPrediction({
        predictionId,
        targetType: "hive",
        hive: hive._id,
        hiveId: cleanHiveId,
        predictionType: "colony_health",
        modelVersion: "1.0.0-hive-health-6tier",
        confidence:
          typeof modelOutput.stressProbability === "number"
            ? modelOutput.stressProbability
            : typeof modelOutput.abnormalityRisk === "number"
            ? (100 - modelOutput.abnormalityRisk) / 100
            : 0.85,
        predictionTimestamp: new Date(),
        inputWindow: {
          startTime: firstTimestamp,
          endTime: lastTimestamp,
          sampleCount: readings.length,
          featureSummary: {
            tier: modelOutput.tier,
            hoursAvailable: modelOutput.hoursAvailable,
            hoursObserved: modelOutput.hoursObserved,
          },
        },
        result: {
          status: mappedStatus,
          riskScore:
            typeof modelOutput.stressProbability === "number"
              ? modelOutput.stressProbability
              : typeof modelOutput.abnormalityRisk === "number"
              ? modelOutput.abnormalityRisk / 100
              : 0.1,
          healthScore: modelOutput.healthScore,
          tier: modelOutput.tier,
          stressRisk: modelOutput.stressRisk,
          stressProbability: modelOutput.stressProbability,
          abnormalityRisk: modelOutput.abnormalityRisk,
          stressBasis: modelOutput.stressBasis,
          detectionScope: modelOutput.detectionScope || [],
          hoursAvailable: modelOutput.hoursAvailable,
          hoursObserved: modelOutput.hoursObserved,
          drivers: modelOutput.drivers || {},
          recommendation: modelOutput.recommendation,
          caveat: modelOutput.caveat,
          detectedAnomalies: modelOutput.detectionScope || [],
          recommendedActions: modelOutput.recommendation ? [modelOutput.recommendation] : [],
          metricsSnapshot: {
            telemetryPointsCount: readings.length,
            latestTelemetryTimestamp: lastTimestamp,
          },
        },
        status: "active",
      });

      savedPrediction = await newPrediction.save();

      // Update Hive health indicators
      hive.currentHealthSummary = hive.currentHealthSummary || { status: "healthy" };
      hive.currentHealthSummary.status =
        modelOutput.stressRisk === "HIGH"
          ? "critical"
          : modelOutput.stressRisk === "MEDIUM"
          ? "warning"
          : "healthy";
      hive.currentHealthSummary.healthScore = modelOutput.healthScore;
      hive.currentHealthSummary.stressIndex =
        modelOutput.abnormalityRisk !== undefined ? modelOutput.abnormalityRisk / 100 : 0;
      hive.currentHealthSummary.lastAIPredictionId = predictionId;
      await hive.save();

      // Trigger critical alert when high colony stress risk is predicted
      if (modelOutput.stressRisk === "HIGH") {
        await alertService
          .createAlertWithCooldown({
            hiveId: cleanHiveId,
            apiaryId: hive.apiaryId,
            organizationId: (hive as any).organizationId,
            severity: "critical",
            alertType: "high_ml_stress_risk",
            message: `AI Diagnostics identified HIGH colony stress risk for hive ${cleanHiveId} (Health Score: ${modelOutput.healthScore}, Tier: ${modelOutput.tier}). Recommendation: ${modelOutput.recommendation || "Immediate apiary inspection recommended"}`,
            metadata: {
              healthScore: modelOutput.healthScore,
              tier: modelOutput.tier,
              drivers: modelOutput.drivers,
            },
            cooldownMinutes: 120,
          })
          .catch((e) => console.warn(`[MLService] Could not record stress alert: ${e.message}`));
      }
    }

    return {
      success: true,
      status: "OK",
      prediction: savedPrediction,
      modelOutput,
    };
  }

  /**
   * Retrieves paginated predictions for a given hive.
   */
  public async getPredictionsByHive(
    hiveId: string,
    limit: number = 20,
    page: number = 1
  ) {
    const cleanHiveId = hiveId.trim();
    const skip = (page - 1) * limit;

    const [predictions, total] = await Promise.all([
      AIPrediction.find({ hiveId: cleanHiveId })
        .sort({ predictionTimestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AIPrediction.countDocuments({ hiveId: cleanHiveId }),
    ]);

    return {
      predictions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves the most recent prediction for a given hive.
   */
  public async getLatestPrediction(hiveId: string) {
    const cleanHiveId = hiveId.trim();
    return AIPrediction.findOne({ hiveId: cleanHiveId })
      .sort({ predictionTimestamp: -1 })
      .lean();
  }
}

export const mlService = new MLService();
export default mlService;
