"use client";

import { useState } from "react";
import { IconActivity, IconCheck, IconPlayerPlay } from "@tabler/icons-react";

import { telemetryService } from "@/services/telemetry.service";

export default function TelemetrySimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSimulate() {
    try {
      setIsRunning(true);
      setMessage(null);

      const response = await telemetryService.simulate();

      setMessage(response.message ?? "Telemetry simulation completed.");
    } catch {
      setMessage("Unable to start telemetry simulation.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/8 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-honey/15 p-3 text-honey">
            <IconActivity size={22} />
          </div>

          <div>
            <h2 className="font-semibold">IoT Telemetry</h2>

            <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
              Generate sensor telemetry for development and demonstration.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSimulate}
          disabled={isRunning}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-medium text-comb transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? (
            <>
              <IconActivity size={18} className="animate-pulse" />
              Simulating...
            </>
          ) : (
            <>
              <IconPlayerPlay size={18} />
              Simulate Telemetry
            </>
          )}
        </button>
      </div>

      {message && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-black/8 bg-black/2.5 p-3 text-sm dark:border-white/10 dark:bg-white/3">
          <IconCheck size={17} className="mt-0.5 shrink-0 text-verified" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
