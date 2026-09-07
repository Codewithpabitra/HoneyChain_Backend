import { ChildProcess, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";
import { SensorReading, Hive, AIPrediction } from "../models/index.js";
import AppError from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  private pythonProcess: ChildProcess | null = null;
  private isStartingProcess = false;

  constructor() {
    this.serviceUrl = env.ML_SERVICE_URL || "http://127.0.0.1:5001";
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
   * Checks the health and availability of the internal Python inference service.
   */
  public async checkHealth(): Promise<MLServiceHealth> {
    try {
      const res = await fetch(`${this.serviceUrl}/health`, {
        signal: AbortSignal.timeout(3000),
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
   * Spawns the local Python inference microservice if not already running.
   */
  public async ensureServiceRunning(): Promise<boolean> {
    const initialHealth = await this.checkHealth();
    if (initialHealth.healthy) {
      return true;
    }

    if (this.isStartingProcess) {
      return false;
    }

    this.isStartingProcess = true;

    // Determine paths across dist/ and dev environments
    const serviceScriptCandidates = [
      path.resolve(__dirname, "../../ml/service.py"),
      path.resolve(process.cwd(), "ml/service.py"),
      path.resolve(process.cwd(), "backend/ml/service.py"),
      path.resolve(__dirname, "../ml/service.py"),
    ];
    let serviceScript: string | null = null;
    for (const cand of serviceScriptCandidates) {
      if (fs.existsSync(cand)) {
        serviceScript = cand;
        break;
      }
    }

    if (!serviceScript) {
      console.warn(`[MLService] Python service script not found in any candidate path`);
      this.isStartingProcess = false;
      return false;
    }

    const venvCandidates = [
      path.resolve(path.dirname(serviceScript), "venv/bin/python3"),
      path.resolve(__dirname, "../../ml/venv/bin/python3"),
      path.resolve(process.cwd(), "ml/venv/bin/python3"),
      path.resolve(process.cwd(), "backend/ml/venv/bin/python3"),
    ];
    let pythonBin = "python3";
    for (const cand of venvCandidates) {
      if (fs.existsSync(cand)) {
        pythonBin = cand;
        break;
      }
    }

    // Self-healing: if venv python not found, try to run setup.sh if present
    if (pythonBin === "python3") {
      const setupScript = path.resolve(path.dirname(serviceScript), "setup.sh");
      if (fs.existsSync(setupScript)) {
        try {
          console.log(`[MLService] Venv not detected. Running self-healing setup: ${setupScript}...`);
          const { execSync } = await import("child_process");
          execSync(`bash "${setupScript}"`, { stdio: "inherit" });
          const candidateVenv = path.resolve(path.dirname(serviceScript), "venv/bin/python3");
          if (fs.existsSync(candidateVenv)) {
            pythonBin = candidateVenv;
          }
        } catch (setupErr: any) {
          console.warn(`[MLService] Setup script execution notice: ${setupErr.message}`);
        }
      }
    }

    try {
      console.log(`[MLService] Spawning Python inference service (${pythonBin} ${serviceScript})...`);
      this.pythonProcess = spawn(pythonBin, [serviceScript, "--port", "5001"], {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.pythonProcess.stdout?.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Python-ML] ${msg}`);
      });

      this.pythonProcess.stderr?.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) console.warn(`[Python-ML-Err] ${msg}`);
      });

      this.pythonProcess.on("exit", (code, signal) => {
        console.warn(`[MLService] Python process exited with code ${code}, signal ${signal}`);
        this.pythonProcess = null;
      });

      // Poll /health up to 10 seconds for startup
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const health = await this.checkHealth();
        if (health.healthy) {
          console.log("[MLService] Python inference service is online and healthy.");
          this.isStartingProcess = false;
          return true;
        }
      }
    } catch (err: any) {
      console.error(`[MLService] Failed to start Python service: ${err.message}`);
    } finally {
      this.isStartingProcess = false;
    }

    return false;
  }

  /**
   * Shuts down any internally spawned Python process.
   */
  public stopService(): void {
    if (this.pythonProcess) {
      console.log("[MLService] Stopping internally spawned Python inference service...");
      this.pythonProcess.kill("SIGTERM");
      this.pythonProcess = null;
    }
  }

  /**
   * Executes inference for a specific hive using historical sensor readings from MongoDB.
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

    // 4. Ensure internal Python service is reachable
    let isHealthy = (await this.checkHealth()).healthy;
    if (!isHealthy) {
      isHealthy = await this.ensureServiceRunning();
    }

    if (!isHealthy) {
      return {
        success: false,
        status: "SERVICE_UNAVAILABLE",
        message: "Hive health ML inference service is currently offline or starting up.",
      };
    }

    // 5. Call Python inference service
    let modelOutput: any;
    try {
      const res = await fetch(`${this.serviceUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiveId: cleanHiveId, readings: modelInput }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as any;
        return {
          success: false,
          status: errorBody.status || "INFERENCE_ERROR",
          message: errorBody.message || `Inference service responded with HTTP ${res.status}`,
        };
      }

      modelOutput = await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: "SERVICE_TIMEOUT",
        message: err.message || "Timeout communicating with ML inference service",
      };
    }

    // 6. Handle model-level non-OK statuses (e.g. INCOMPLETE_FEATURES, NO_DATA)
    if (modelOutput.status !== "OK") {
      return {
        success: false,
        status: modelOutput.status || "INSUFFICIENT_DATA",
        message: modelOutput.message || "Model could not calculate health score from available features.",
        modelOutput,
      };
    }

    // 7. Persist prediction into MongoDB AIPrediction
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
