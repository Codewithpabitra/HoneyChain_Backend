"use client";

import { useEffect, useState } from "react";
import { mlService } from "@/services/ml.service";

type HealthState = "loading" | "healthy" | "unhealthy";

export default function MLHealthIndicator() {
  const [state, setState] = useState<HealthState>("loading");

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const response = await mlService.health();

        if (mounted) {
          setState(
            response.status >= 200 && response.status < 300
              ? "healthy"
              : "unhealthy",
          );
        }
      } catch {
        if (mounted) {
          setState("unhealthy");
        }
      }
    }

    checkHealth();

    return () => {
      mounted = false;
    };
  }, []);

  const isHealthy = state === "healthy";

  return (
    <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
      <span
        className={`h-2 w-2 rounded-full ${
          state === "loading"
            ? "bg-black/20 dark:bg-white/20"
            : isHealthy
              ? "bg-verified"
              : "bg-alert"
        }`}
      />

      <span>
        {state === "loading"
          ? "Checking AI service..."
          : isHealthy
            ? "AI service online"
            : "AI service unavailable"}
      </span>
    </div>
  );
}
