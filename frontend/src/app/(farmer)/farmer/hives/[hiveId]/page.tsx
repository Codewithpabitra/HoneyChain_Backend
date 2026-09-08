"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBrain,
  IconDroplets,
  IconHexagon,
  IconTemperature,
  IconWeight,
  IconRefresh,
} from "@tabler/icons-react";

import { mlService } from "@/services/ml.service";
import type { Prediction } from "@/types/prediction";
import TelemetrySimulator from "@/components/telemetry/TelemetrySimulator";
import TelemetryForm from "@/components/telemetry/TelemetryForm";
import PredictionHistory from "@/components/telemetry/PredictionHistory";
import MLHealthIndicator from "@/components/telemetry/MLHealthIndicator";

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof IconTemperature;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-black/55 dark:text-white/55">
          {label}
        </span>

        <Icon size={20} stroke={1.7} className="text-honey" />
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{value}</span>

        {unit && (
          <span className="text-sm text-black/45 dark:text-white/45">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HiveDetailsPage() {
  const params = useParams<{ hiveId: string }>();
  const hiveId = params.hiveId;

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await mlService.getLatest(hiveId);

        if (mounted) {
          setPrediction(response.data);
          setError(null);
        }
      } catch {
        if (mounted) {
          setError("AI prediction is currently unavailable.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    const interval = window.setInterval(load, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [hiveId]);

  const metrics = prediction?.metricsSnapshot;

  async function loadPrediction() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await mlService.getLatest(hiveId);

      setPrediction(response.data);
    } catch {
      setError("AI prediction is currently unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runAnalysis() {
    try {
      setIsAnalyzing(true);
      setError(null);

      await mlService.predict(hiveId);

      await loadPrediction();
    } catch {
      setError("AI analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/farmer/hives"
          className="rounded-xl border border-black/10 p-2 transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          aria-label="Back to hives"
        >
          <IconArrowLeft size={19} />
        </Link>

        <div>
          <p className="text-sm text-black/50 dark:text-white/50">
            Hive Monitoring
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">{hiveId}</h1>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Temperature"
          value={metrics ? metrics.temperature.toFixed(1) : "—"}
          unit="°C"
          icon={IconTemperature}
        />

        <MetricCard
          label="Humidity"
          value={metrics ? metrics.humidity.toFixed(1) : "—"}
          unit="%"
          icon={IconDroplets}
        />

        <MetricCard
          label="Hive Weight"
          value={metrics ? metrics.weightKg.toFixed(1) : "—"}
          unit="kg"
          icon={IconWeight}
        />

        <MetricCard
          label="Sound Frequency"
          value={
            metrics?.soundFrequencyHz !== undefined
              ? metrics.soundFrequencyHz.toFixed(0)
              : "—"
          }
          unit="Hz"
          icon={IconHexagon}
        />
      </section>

      {/* telemetry form  */}
      <TelemetryForm hiveId={hiveId} onSubmitted={loadPrediction} />

      {/* Telemetry simulator  */}
      <TelemetrySimulator />

      {/* AI Hive Health */}
      <section className="rounded-2xl border border-black/8 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-xl bg-honey/15 p-2.5 text-honey">
            <IconBrain size={22} />
          </div>

          <div>
            <h2 className="font-semibold">AI Hive Health</h2>
            <p className="text-sm text-black/50 dark:text-white/50">
              Latest prediction from the hive monitoring model
            </p>
          </div>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5 sm:mt-0"
          >
            <IconRefresh
              size={17}
              className={isAnalyzing ? "animate-spin" : ""}
            />
            {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
          </button>
        </div>

        <MLHealthIndicator />

        {isLoading ? (
          <div className="text-sm text-black/50 dark:text-white/50">
            Loading AI prediction...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-alert">
            <IconAlertTriangle size={18} />
            {error}
          </div>
        ) : prediction ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold">
                  {prediction.status.replaceAll("_", " ")}
                </p>

                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                  Confidence: {(prediction.confidence * 100).toFixed(1)}%
                </p>

                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  Last analyzed{" "}
                  {new Date(prediction.timestamp).toLocaleString()}
                </p>
              </div>

              <span className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium dark:border-white/10">
                Tier {prediction.tier}
              </span>
            </div>

            {prediction.alerts.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium">Alerts</h3>

                <div className="space-y-2">
                  {prediction.alerts.map((alert, index) => (
                    <div
                      key={`${alert}-${index}`}
                      className="flex items-start gap-2 rounded-xl border border-alert/20 bg-alert/5 p-3 text-sm"
                    >
                      <IconAlertTriangle
                        size={17}
                        className="mt-0.5 shrink-0 text-alert"
                      />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prediction.recommendations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium">Recommendations</h3>

                <div className="space-y-2">
                  {prediction.recommendations.map((recommendation, index) => (
                    <div
                      key={`${recommendation}-${index}`}
                      className="rounded-xl bg-black/3 p-3 text-sm dark:bg-white/4"
                    >
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">
            No AI prediction is available for this hive yet.
          </p>
        )}
      </section>

      {/* Prediction history  */}
      <PredictionHistory hiveId={hiveId} />
    </div>
  );
}
