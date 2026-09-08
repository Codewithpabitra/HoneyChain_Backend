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
  const [soundFrequencyHz, setSoundFrequencyHz] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const temperatureValue = Number(temperature);
    const humidityValue = Number(humidity);
    const weightValue = Number(weightKg);
    const batteryValue = Number(batteryLevelPct);
    const soundValue = soundFrequencyHz ? Number(soundFrequencyHz) : undefined;

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

    if (soundValue !== undefined && !Number.isFinite(soundValue)) {
      setError("Sound frequency must be a valid number.");
      return;
    }

    const payload: Telemetry = {
      deviceId,
      hiveId,
      timestamp: Date.now(),
      temperature: temperatureValue,
      humidity: humidityValue,
      weightKg: weightValue,
      batteryLevelPct: batteryValue,
      ...(soundValue !== undefined && {
        soundFrequencyHz: soundValue,
      }),
    };

    try {
      setIsSubmitting(true);

      await telemetryService.create(payload);

      setTemperature("");
      setHumidity("");
      setWeightKg("");
      setBatteryLevelPct("");
      setSoundFrequencyHz("");

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
          placeholder="Battery (%)"
          className="input"
          required
        />

        <input
          value={soundFrequencyHz}
          onChange={(e) => setSoundFrequencyHz(e.target.value)}
          type="number"
          step="0.1"
          placeholder="Sound Frequency (Hz)"
          className="input sm:col-span-2"
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
