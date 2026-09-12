"use client";

import { useEffect, useState } from "react";
import { mlService } from "@/services/ml.service";
import type { HistoricalPrediction } from "@/types/prediction";

interface PredictionHistoryProps {
  hiveId: string;
}

export default function PredictionHistory({
  hiveId,
}: PredictionHistoryProps) {
  const [predictions, setPredictions] = useState<HistoricalPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        setIsLoading(true);

        const response = await mlService.getHistory(hiveId);

        if (mounted) {
          setPredictions(response.data.predictions);
        }
      } catch {
        if (mounted) {
          setPredictions([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [hiveId]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/4">
        <p className="text-sm text-black/50 dark:text-white/50">
          Loading prediction history...
        </p>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/4">
        <p className="text-sm text-black/50 dark:text-white/50">
          No prediction history available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/4">
      <div className="border-b border-black/10 px-5 py-4 dark:border-white/10">
        <h3 className="font-semibold">Prediction History</h3>
      </div>

      <div className="divide-y divide-black/10 dark:divide-white/10">
        {predictions.map((prediction: any) => {
          const rawStatus = prediction.result?.status || prediction.status || "HEALTHY";
          const statusText = String(rawStatus).replaceAll("_", " ");
          const score = prediction.result?.healthScore ?? prediction.healthScore;
          const timestamp = prediction.predictionTimestamp || prediction.createdAt;
          const hasGemini = prediction.gemini?.triggered === true;

          return (
            <div
              key={prediction._id || prediction.predictionId}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium capitalize">
                    {statusText}
                  </p>
                  {hasGemini && (
                    <span className="rounded-full bg-honey/15 px-2 py-0.5 text-[10px] font-semibold text-honey">
                      AI Analyzed
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  {timestamp ? new Date(timestamp).toLocaleString() : "Recent"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold">
                  {typeof score === "number"
                    ? `${score}%`
                    : typeof prediction.confidence === "number"
                    ? `${(prediction.confidence * 100).toFixed(0)}%`
                    : "—"}
                </p>

                <p className="text-xs text-black/40 dark:text-white/40">
                  Health Score
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}