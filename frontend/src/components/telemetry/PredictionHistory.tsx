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
        {predictions.map((prediction) => (
          <div
            key={prediction._id}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium">
                {prediction.status.replaceAll("_", " ")}
              </p>

              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                {new Date(prediction.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">
                {(prediction.confidence * 100).toFixed(1)}%
              </p>

              <p className="text-xs text-black/40 dark:text-white/40">
                Confidence
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}