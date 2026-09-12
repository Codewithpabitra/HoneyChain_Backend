"use client";

import { useState } from "react";
import { telemetryService } from "@/services/telemetry.service";
import type { Telemetry } from "@/types/telemetry";

interface TelemetryFormProps {
  hiveId: string;
  deviceId?: string;
  onSubmitted?: () => void;
}

export default function TelemetryForm({
  hiveId,
  deviceId = "demo-device",
  onSubmitted,
}: TelemetryFormProps) {
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [batteryLevelPct, setBatteryLevelPct] = useState("");
  const [beeInCount, setBeeInCount] = useState("");
  const [beeOutCount, setBeeOutCount] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const temperatureValue = Number(temperature);
    const humidityValue = Number(humidity);
    const weightValue = Number(weightKg);
    const batteryValue = Number(batteryLevelPct);
    const beeInValue = beeInCount !== "" ? Number(beeInCount) : undefined;
    const beeOutValue = beeOutCount !== "" ? Number(beeOutCount) : undefined;

    if (
      !Number.isFinite(temperatureValue) ||
      !Number.isFinite(humidityValue) ||
      !Number.isFinite(weightValue) ||
      !Number.isFinite(batteryValue)
    ) {
      setError("Please enter valid sensor values.");
      return;
    }

    if (humidityValue < 0 || humidityValue > 100) {
      setError("Humidity must be between 0 and 100.");
      return;
    }

    if (batteryValue < 0 || batteryValue > 100) {
      setError("Battery level must be between 0 and 100.");
      return;
    }

    if (beeInValue !== undefined && (!Number.isInteger(beeInValue) || beeInValue < 0)) {
      setError("Bee In count must be a non-negative whole number.");
      return;
    }

    if (beeOutValue !== undefined && (!Number.isInteger(beeOutValue) || beeOutValue < 0)) {
      setError("Bee Out count must be a non-negative whole number.");
      return;
    }

    const payload: Telemetry = {
      deviceId,
      hiveId,
      timestamp: new Date().toISOString(),
      temperature: temperatureValue,
      humidity: humidityValue,
      weightKg: weightValue,
      batteryLevelPct: batteryValue,
      ...(beeInValue !== undefined && { beeInCount: beeInValue }),
      ...(beeOutValue !== undefined && { beeOutCount: beeOutValue }),
    };

    try {
      setIsSubmitting(true);

      await telemetryService.create(payload);

      setTemperature("");
      setHumidity("");
      setWeightKg("");
      setBatteryLevelPct("");
      setBeeInCount("");
      setBeeOutCount("");

      onSubmitted?.();
    } catch {
      setError("Failed to submit telemetry data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          type="number"
          step="0.1"
          placeholder="Temperature (°C)"
          className="input"
          required
        />

        <input
          value={humidity}
          onChange={(e) => setHumidity(e.target.value)}
          type="number"
          step="0.1"
          placeholder="Humidity (%)"
          className="input"
          required
        />

        <input
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          type="number"
          step="0.01"
          placeholder="Hive Weight (kg)"
          className="input"
          required
        />

        <input
          value={batteryLevelPct}
          onChange={(e) => setBatteryLevelPct(e.target.value)}
          type="number"
          step="1"
          min="0"
          max="100"
          placeholder="Battery (%)"
          className="input"
          required
        />

        <input
          value={beeInCount}
          onChange={(e) => setBeeInCount(e.target.value)}
          type="number"
          step="1"
          min="0"
          placeholder="Bee In Count (bees/min)"
          className="input"
        />

        <input
          value={beeOutCount}
          onChange={(e) => setBeeOutCount(e.target.value)}
          type="number"
          step="1"
          min="0"
          placeholder="Bee Out Count (bees/min)"
          className="input"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-comb transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Telemetry"}
      </button>
    </form>
  );
}
