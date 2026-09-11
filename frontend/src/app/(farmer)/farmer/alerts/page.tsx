// src/app/(farmer)/farmer/alerts/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconClock,
  IconHexagon,
  IconRefresh,
  IconFilter,
} from "@tabler/icons-react";

import { alertService } from "@/services/alert.service";
import type { Alert, AlertSeverity } from "@/types/alert";

export default function FarmerAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "ALL">("ALL");
  const [resolvedFilter, setResolvedFilter] = useState<"ACTIVE" | "RESOLVED" | "ALL">("ACTIVE");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isResolved =
        resolvedFilter === "ALL"
          ? undefined
          : resolvedFilter === "RESOLVED";

      const res = await alertService.getAlerts({
        severity: severityFilter === "ALL" ? undefined : severityFilter,
        isResolved,
      });
      setAlerts(res.data || []);
    } catch {
      setError("Failed to load alerts from backend.");
    } finally {
      setLoading(false);
    }
  }, [severityFilter, resolvedFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleResolve(id: string) {
    setResolvingId(id);
    try {
      await alertService.resolveAlert(id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("honeychain:alerts-updated"));
      }
      await fetchAlerts();
    } catch {
      alert("Failed to resolve alert. Please try again.");
    } finally {
      setResolvingId(null);
    }
  }

  const stats = useMemo(() => {
    const active = alerts.filter((a) => !a.isResolved).length;
    const critical = alerts.filter((a) => a.severity === "critical" && !a.isResolved).length;
    const resolved = alerts.filter((a) => a.isResolved).length;
    return { active, critical, resolved };
  }, [alerts]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Colony Health & Safety
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
            Apiary Alerts
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Automated sensor threshold and AI anomaly notifications for your hives.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Active Alerts</p>
          <p className="mt-2 text-2xl font-bold text-ink dark:text-ink-dark">
            {loading ? "—" : stats.active}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Critical Risks</p>
          <p className="mt-2 text-2xl font-bold text-alert">
            {loading ? "—" : stats.critical}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Resolved</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : stats.resolved}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
          {(["ACTIVE", "RESOLVED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setResolvedFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                resolvedFilter === tab
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              {tab === "ACTIVE"
                ? "Active Only"
                : tab === "RESOLVED"
                ? "Resolved"
                : "All Status"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
          {(["ALL", "critical", "warning", "info"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                severityFilter === sev
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
          Loading alerts…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-alert/20 bg-alert/5 p-6 text-center text-sm text-alert">
          {error}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconBell size={28} stroke={1.6} />
          </div>

          <h2 className="mt-5 font-semibold text-ink dark:text-ink-dark">No alerts match this filter</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            Your colonies are operating within normal environmental and acoustic thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 transition sm:flex-row sm:items-center ${
                alert.isResolved
                  ? "border-black/5 bg-white/40 opacity-70 dark:border-white/5 dark:bg-white/2"
                  : alert.severity === "critical"
                  ? "border-alert/30 bg-alert/5"
                  : alert.severity === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-black/10 bg-white dark:border-white/10 dark:bg-white/3"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 rounded-xl p-2.5 ${
                    alert.severity === "critical"
                      ? "bg-alert/15 text-alert"
                      : alert.severity === "warning"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-honey/15 text-honey"
                  }`}
                >
                  <IconAlertTriangle size={20} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        alert.severity === "critical"
                          ? "bg-alert/20 text-alert"
                          : alert.severity === "warning"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <Link
                      href={`/farmer/hives/${encodeURIComponent(alert.hiveId)}`}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-honey hover:underline"
                    >
                      <IconHexagon size={13} />
                      {alert.hiveId}
                    </Link>

                    <span className="text-xs text-black/40 dark:text-white/40">
                      • {new Date(alert.createdAt).toLocaleString()}
                    </span>

                    {alert.isResolved && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <IconCheck size={13} />
                        Resolved
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-medium text-ink dark:text-ink-dark">
                    {alert.message}
                  </p>

                  {alert.alertType && (
                    <p className="mt-1 font-mono text-xs text-black/50 dark:text-white/50">
                      Event: {alert.alertType.replace("_", " ")}
                    </p>
                  )}
                </div>
              </div>

              {!alert.isResolved && (
                <button
                  type="button"
                  onClick={() => handleResolve(alert._id)}
                  disabled={resolvingId === alert._id}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink shadow-2xs transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-ink-dark dark:hover:bg-white/10"
                >
                  <IconCheck size={14} />
                  {resolvingId === alert._id ? "Resolving…" : "Resolve Alert"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
