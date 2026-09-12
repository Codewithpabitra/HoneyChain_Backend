// backend/src/services/predictionTrigger.service.ts
import { env } from "../config/env.js";
import type { Sensor48hSummary } from "./gemini.service.js";

export interface TriggerEvaluationResult {
  shouldTrigger: boolean;
  reason?: string;
  isCriticalEscalation: boolean;
  details?: Record<string, any>;
}

export interface PredictionHistoryItem {
  timestamp: Date;
  healthScore: number;
  status: string;
  geminiTriggered?: boolean;
}

export class PredictionTriggerService {
  // Configurable thresholds
  public readonly HEALTH_DROP_24H_THRESHOLD = 15;
  public readonly HEALTH_DROP_HOURLY_THRESHOLD = 10;
  public readonly CRITICAL_HEALTH_SCORE = 40;
  public readonly PERSISTENT_ABNORMAL_COUNT = 3;
  public readonly COOLDOWN_HOURS = env.GEMINI_COOLDOWN_HOURS || 6;

  /**
   * Evaluates whether Gemini AI reasoning should be triggered for a hive.
   */
  public evaluateTrigger(
    currentPrediction: {
      healthScore: number;
      status: string;
      stressRisk?: string | null;
    },
    predictionHistory: PredictionHistoryItem[],
    sensorSummary: Sensor48hSummary,
    lastGeminiTriggerTime?: Date | null
  ): TriggerEvaluationResult {
    const currentScore = currentPrediction.healthScore;
    const currentStatus = currentPrediction.status.toLowerCase();
    const previousPrediction =
      predictionHistory.length > 0 ? predictionHistory[0] : null;

    let triggerReason = "";
    let isCriticalEscalation = false;

    // 1. Check Critical Health
    if (currentScore <= this.CRITICAL_HEALTH_SCORE || currentStatus === "critical") {
      triggerReason = `CRITICAL_HEALTH (Score: ${currentScore}, Status: ${currentStatus})`;
      if (!previousPrediction || previousPrediction.status.toLowerCase() !== "critical") {
        isCriticalEscalation = true;
      }
    }

    // 2. Check State Transition (healthy/normal -> warning, warning -> critical)
    if (!triggerReason && previousPrediction) {
      const prevStatus = previousPrediction.status.toLowerCase();
      const isNormal = prevStatus === "healthy" || prevStatus === "normal";
      const isWarning = prevStatus === "warning";

      if (isNormal && (currentStatus === "warning" || currentStatus === "critical")) {
        triggerReason = `STATE_TRANSITION (${prevStatus} -> ${currentStatus})`;
        if (currentStatus === "critical") isCriticalEscalation = true;
      } else if (isWarning && currentStatus === "critical") {
        triggerReason = `STATE_TRANSITION (warning -> critical)`;
        isCriticalEscalation = true;
      }
    }

    // 3. Check Significant Health Deterioration
    if (!triggerReason && previousPrediction) {
      const hourlyDrop = previousPrediction.healthScore - currentScore;
      if (hourlyDrop >= this.HEALTH_DROP_HOURLY_THRESHOLD) {
        triggerReason = `RAPID_HEALTH_DROP (-${hourlyDrop} points in 1h)`;
        if (hourlyDrop >= 20) isCriticalEscalation = true;
      }
    }

    if (!triggerReason && predictionHistory.length >= 2) {
      // Find highest score in past 24h
      const maxPastScore = Math.max(...predictionHistory.map((p) => p.healthScore));
      const drop24h = maxPastScore - currentScore;
      if (drop24h >= this.HEALTH_DROP_24H_THRESHOLD) {
        triggerReason = `SIGNIFICANT_HEALTH_DETERIORATION (-${drop24h} points in 24h)`;
      }
    }

    // 4. Check Persistent Abnormal Health
    if (!triggerReason && predictionHistory.length >= this.PERSISTENT_ABNORMAL_COUNT) {
      const recent = predictionHistory.slice(0, this.PERSISTENT_ABNORMAL_COUNT);
      const allAbnormal =
        (currentStatus === "warning" || currentStatus === "critical") &&
        recent.every((p) => p.status.toLowerCase() === "warning" || p.status.toLowerCase() === "critical");

      if (allAbnormal) {
        triggerReason = `PERSISTENT_ABNORMAL_HEALTH (${this.PERSISTENT_ABNORMAL_COUNT + 1} consecutive abnormal predictions)`;
      }
    }

    // 5. Check Significant Sensor Anomalies
    if (!triggerReason) {
      if (sensorSummary.temperature.min < 31.5) {
        triggerReason = `SENSOR_ANOMALY (Brood nest hypothermia: ${sensorSummary.temperature.min}°C)`;
      } else if (sensorSummary.temperature.max > 38.0) {
        triggerReason = `SENSOR_ANOMALY (Brood nest hyperthermia: ${sensorSummary.temperature.max}°C)`;
      } else if (sensorSummary.weight.netChangeKg < -1.5) {
        triggerReason = `SENSOR_ANOMALY (Rapid weight drop: ${sensorSummary.weight.netChangeKg} kg in 48h)`;
      } else if (sensorSummary.humidity.latest > 85.0) {
        triggerReason = `SENSOR_ANOMALY (Extreme internal humidity: ${sensorSummary.humidity.latest}%)`;
      }
    }

    // If no trigger condition met
    if (!triggerReason) {
      return {
        shouldTrigger: false,
        isCriticalEscalation: false,
      };
    }

    // 6. Cooldown Evaluation
    if (lastGeminiTriggerTime) {
      const elapsedHours =
        (Date.now() - new Date(lastGeminiTriggerTime).getTime()) / (1000 * 60 * 60);

      if (elapsedHours < this.COOLDOWN_HOURS) {
        // Only allow critical escalation to bypass cooldown
        if (isCriticalEscalation) {
          return {
            shouldTrigger: true,
            reason: `${triggerReason} [CRITICAL_ESCALATION_BYPASS_COOLDOWN]`,
            isCriticalEscalation: true,
            details: { elapsedHours, cooldownHours: this.COOLDOWN_HOURS },
          };
        }

        // Suppress trigger under cooldown
        return {
          shouldTrigger: false,
          reason: `${triggerReason} [SUPPRESSED_BY_COOLDOWN_${elapsedHours.toFixed(1)}h_OF_${this.COOLDOWN_HOURS}h]`,
          isCriticalEscalation: false,
          details: { elapsedHours, cooldownHours: this.COOLDOWN_HOURS },
        };
      }
    }

    return {
      shouldTrigger: true,
      reason: triggerReason,
      isCriticalEscalation,
    };
  }
}

export const predictionTriggerService = new PredictionTriggerService();
export default predictionTriggerService;
