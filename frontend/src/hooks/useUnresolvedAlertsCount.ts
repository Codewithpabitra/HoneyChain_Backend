"use client";

import { useEffect, useState, useCallback } from "react";
import { alertService } from "@/services/alert.service";
import { useAuth } from "@/components/providers/AuthProvider";

export function useUnresolvedAlertsCount(pollIntervalMs: number = 8000) {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const res = await alertService.getAlerts({ isResolved: false, limit: 1 });
      const total =
        typeof res?.pagination?.total === "number"
          ? res.pagination.total
          : res?.data?.length ?? 0;
      setCount(total);
    } catch {
      // Ignore network errors gracefully
    }
  }, [user]);

  useEffect(() => {
    fetchCount();

    const handleAlertsUpdated = () => {
      fetchCount();
    };

    window.addEventListener("honeychain:alerts-updated", handleAlertsUpdated);
    window.addEventListener("focus", handleAlertsUpdated);

    const interval = setInterval(fetchCount, pollIntervalMs);

    return () => {
      window.removeEventListener("honeychain:alerts-updated", handleAlertsUpdated);
      window.removeEventListener("focus", handleAlertsUpdated);
      clearInterval(interval);
    };
  }, [fetchCount, pollIntervalMs]);

  return { count, refresh: fetchCount };
}
export default useUnresolvedAlertsCount;
