"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconCheck,
  IconExternalLink,
  IconHexagon,
  IconInfoCircle,
  IconLoader2,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

import { alertService } from "@/services/alert.service";
import type { Alert, AlertSeverity } from "@/types/alert";

export default function AuthorityAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | AlertSeverity | "RESOLVED">("ALL");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadAlerts() {
    try {
      setLoading(true);
      setError(null);
      const res = await alertService.getAlerts({ limit: 100 });
      setAlerts(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load network alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function handleResolve(id: string) {
    try {
      setResolvingId(id);
      await alertService.resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === id
            ? { ...a, isResolved: true, resolved: true, resolvedAt: new Date().toISOString() }
            : a
        )
      );
    } catch (err) {
      alert("Failed to resolve alert: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setResolvingId(null);
    }
  }

  const activeAlerts = alerts.filter((a) => !(a.isResolved ?? a.resolved));
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const resolvedCount = alerts.filter((a) => Boolean(a.isResolved ?? a.resolved)).length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const q = search.toLowerCase();
      const isResolved = Boolean(a.isResolved ?? a.resolved);
      const matchesSearch =
        !search.trim() ||
        a.alertType?.toLowerCase().includes(q) ||
        (a.title && a.title.toLowerCase().includes(q)) ||
        a.message?.toLowerCase().includes(q) ||
        a.hiveId?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === "ALL") return !isResolved;
      if (filter === "RESOLVED") return isResolved;
      return !isResolved && a.severity === filter.toLowerCase();
    });
  }, [alerts, search, filter]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Network Risk Monitoring
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Alerts & Anomalies</h1>

          <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
            Monitor hive anomalies, environmental stress conditions, and AI risk indicators across Honey Chain apiaries.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Active Alerts</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : activeAlerts.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">High Risk (Critical)</p>
          <p className="mt-3 text-2xl font-bold text-red-500">
            {loading ? "..." : criticalCount}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Resolved Alerts</p>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : resolvedCount}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <IconSearch
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by title, hive ID, message..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-black/10 bg-black/3 p-1 dark:border-white/10 dark:bg-white/3">
          {(
            [
              { key: "ALL", label: `Active (${activeAlerts.length})` },
              { key: "critical", label: "Critical" },
              { key: "warning", label: "Warning" },
              { key: "info", label: "Info" },
              { key: "RESOLVED", label: `Resolved (${resolvedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === tab.key
                  ? "bg-white text-black shadow-xs dark:bg-white/10 dark:text-white"
                  : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading alerts from monitoring system…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-500">
          {error}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <IconCheck size={28} stroke={2} />
          </div>

          <h2 className="mt-5 font-semibold">
            {search ? "No matching alerts found" : "No alerts found"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search criteria."
              : "All colonies and IoT devices are operating within normal parameters."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === "critical";
            const isWarning = alert.severity === "warning";
            const isResolved = Boolean(alert.isResolved ?? alert.resolved);
            const alertTitle =
              alert.title || alert.alertType.replace(/_/g, " ").toUpperCase();

            return (
              <div
                key={alert._id}
                className={`rounded-2xl border p-5 transition ${
                  isResolved
                    ? "border-black/5 bg-black/2 opacity-75 dark:border-white/5 dark:bg-white/1"
                    : isCritical
                    ? "border-red-500/30 bg-red-500/5 dark:border-red-500/20"
                    : isWarning
                    ? "border-amber-500/30 bg-amber-500/5 dark:border-amber-500/20"
                    : "border-blue-500/30 bg-blue-500/5 dark:border-blue-500/20"
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isResolved
                          ? "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
                          : isCritical
                          ? "bg-red-500/20 text-red-600 dark:text-red-400"
                          : isWarning
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {isResolved ? (
                        <IconCheck size={18} />
                      ) : isCritical || isWarning ? (
                        <IconAlertTriangle size={18} />
                      ) : (
                        <IconInfoCircle size={18} />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-black dark:text-white">
                          {alertTitle}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : isWarning
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        {isResolved && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Resolved
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                        {alert.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-black/50 dark:text-white/50">
                        {alert.hiveId && (
                          <Link
                            href={`/farmer/hives/${encodeURIComponent(alert.hiveId)}`}
                            className="font-mono text-honey hover:underline"
                          >
                            Hive: {alert.hiveId}
                          </Link>
                        )}
                        <span>
                          {alert.createdAt
                            ? new Date(alert.createdAt).toLocaleString()
                            : "Recent"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => handleResolve(alert._id)}
                      disabled={resolvingId === alert._id}
                      className="shrink-0 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      {resolvingId === alert._id ? (
                        <span className="flex items-center gap-1">
                          <IconLoader2 size={14} className="animate-spin" />
                          Resolving…
                        </span>
                      ) : (
                        "Mark Resolved"
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI monitoring link */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconAlertTriangle size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">AI Risk Detection</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Machine learning anomaly detection algorithms continuously analyze hive weight, temperature, acoustic frequencies, and humidity.
          </p>

          <Link
            href="/authority/hives"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View hives
            <IconArrowUpRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconHexagon size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Hive Health Monitoring</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Review colony survival and health trends across all registered production zones.
          </p>

          <Link
            href="/authority/analytics"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View analytics
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}