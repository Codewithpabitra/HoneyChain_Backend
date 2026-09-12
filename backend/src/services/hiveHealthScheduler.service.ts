// backend/src/services/hiveHealthScheduler.service.ts
import { Hive, AIPrediction } from "../models/index.js";
import mlService from "./ml.service.js";

export interface ScheduledRunResult {
  hiveId: string;
  status: string;
  skipped?: boolean;
  reason?: string;
  predictionId?: string;
  healthScore?: number;
  geminiTriggered?: boolean;
  error?: string;
}

export class HiveHealthScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private intervalMs: number;

  constructor(intervalMinutes = 60) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  /**
   * Starts the background recurring hourly ML health evaluation loop.
   */
  public start(): void {
    if (this.timer) {
      console.log("[HiveHealthScheduler] Scheduler is already active.");
      return;
    }

    console.log(
      `[HiveHealthScheduler] Starting automated hourly hive health loop (interval: ${this.intervalMs / 60000}m)`
    );

    // Run initial pass shortly after startup (after 10 seconds to allow DB connect)
    setTimeout(() => {
      this.runPipelineNow().catch((err) =>
        console.error("[HiveHealthScheduler] Initial startup run failed:", err.message)
      );
    }, 10000);

    // Setup recurring interval
    this.timer = setInterval(() => {
      this.runPipelineNow().catch((err) =>
        console.error("[HiveHealthScheduler] Scheduled run failed:", err.message)
      );
    }, this.intervalMs);
  }

  /**
   * Stops the background timer.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[HiveHealthScheduler] Scheduler stopped.");
    }
  }

  /**
   * Executes one full iteration of the 48h rolling window ML + Gemini pipeline
   * across all active registered hives. Deduplicates against predictions generated
   * in the past 50 minutes.
   */
  public async runPipelineNow(): Promise<{
    processedCount: number;
    results: ScheduledRunResult[];
  }> {
    if (this.isProcessing) {
      console.warn("[HiveHealthScheduler] Pipeline run is already in progress. Skipping duplicate tick.");
      return { processedCount: 0, results: [] };
    }

    this.isProcessing = true;
    const results: ScheduledRunResult[] = [];

    try {
      const activeHives = await Hive.find({ status: "active" })
        .select("hiveId apiaryId")
        .lean();

      console.log(`[HiveHealthScheduler] Found ${activeHives.length} active hive(s) to evaluate.`);

      const fiftyMinutesAgo = new Date(Date.now() - 50 * 60 * 1000);

      for (const hive of activeHives) {
        try {
          // Check if an evaluation already ran for this hive within the last 50 minutes
          const recentPrediction = await AIPrediction.findOne({
            hiveId: hive.hiveId,
            predictionTimestamp: { $gte: fiftyMinutesAgo },
          })
            .select("predictionId predictionTimestamp")
            .lean();

          if (recentPrediction) {
            results.push({
              hiveId: hive.hiveId,
              status: "SKIPPED",
              skipped: true,
              reason: `Prediction generated recently at ${recentPrediction.predictionTimestamp.toISOString()}`,
            });
            continue;
          }

          // Execute 48-hour rolling window inference with Gemini decision support
          const predResult = await mlService.predictForHive(hive.hiveId, {
            persist: true,
            require48Hours: true,
          });

          if (!predResult.success) {
            results.push({
              hiveId: hive.hiveId,
              status: predResult.status,
              reason: predResult.message,
            });
            continue;
          }

          results.push({
            hiveId: hive.hiveId,
            status: "OK",
            predictionId: predResult.prediction?.predictionId,
            healthScore: predResult.modelOutput?.healthScore,
            geminiTriggered: predResult.geminiAnalysis?.triggered === true,
          });
        } catch (hiveErr: any) {
          console.error(`[HiveHealthScheduler] Error processing hive ${hive.hiveId}:`, hiveErr.message);
          results.push({
            hiveId: hive.hiveId,
            status: "ERROR",
            error: hiveErr.message,
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return {
      processedCount: results.length,
      results,
    };
  }
}

export const hiveHealthScheduler = new HiveHealthScheduler();
export default hiveHealthScheduler;
