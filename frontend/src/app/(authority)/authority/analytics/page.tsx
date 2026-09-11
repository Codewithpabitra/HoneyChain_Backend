"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowUpRight,
  IconChartBar,
  IconHexagon,
  IconLoader2,
  IconRefresh,
  IconShieldCheck,
  IconTrendingUp,
} from "@tabler/icons-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { analyticsService } from "@/services/analytics.service";
import type { DashboardStats, ClusterInfo } from "@/types/analytics";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { StaggerContainer, StaggerItem, LivePulse } from "@/components/ui/MotionComponents";
import { clearApiCache } from "@/lib/apiCache";

export default function AuthorityAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData(bypassCache = false) {
    try {
      setLoading(true);
      setError(null);
      if (bypassCache) {
        clearApiCache();
      }
      const [dashRes, clusterRes] = await Promise.allSettled([
        analyticsService.getDashboardStats(),
        analyticsService.getClusters(),
      ]);

      if (dashRes.status === "fulfilled") {
        setStats(dashRes.value.data);
      } else {
        setError("Failed to fetch dashboard metrics.");
      }

      if (clusterRes.status === "fulfilled") {
        setClusters(clusterRes.value.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalProductionKg = stats
    ? stats.batches.totalQuantityKg || stats.harvests.totalQuantityKg
    : 0;
  const avgHealth = stats?.hives.averageHealthScore || 88;
  const activeAlerts = stats?.alerts.active || 0;
  const verifiedBatches = stats?.batches.total || 0;

  // Chart data: Cluster distribution if available, otherwise batches status breakdown
  const clusterChartData: Array<{ name: string; Hives: number; Apiaries: number }> =
    clusters.length > 0
      ? clusters.map((c) => {
          const label = c.region || c.cluster || "Cluster";
          return {
            name: label.length > 14 ? `${label.slice(0, 12)}…` : label,
            Hives: c.totalHives,
            Apiaries: c.apiaryCount ?? c.totalApiaries ?? 0,
          };
        })
      : [
          { name: "Created", Hives: stats?.batches.created ?? 0, Apiaries: 0 },
          { name: "Certified", Hives: stats?.batches.tested ?? 0, Apiaries: 0 },
          { name: "In Transit", Hives: stats?.batches.inTransit ?? 0, Apiaries: 0 },
          { name: "Delivered", Hives: stats?.batches.delivered ?? 0, Apiaries: 0 },
          { name: "Recalled", Hives: stats?.batches.recalled ?? 0, Apiaries: 0 },
        ];

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Insights &amp; Monitoring
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>

          <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
            Network oversight across regional clusters, colony vitality indices, and ledger distribution flows.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <div className="rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/3">
            <p className="text-sm text-black/50 dark:text-white/50">Honey Production</p>
            <p className="mt-3 text-2xl font-bold">
              {loading ? (
                <span className="inline-block h-7 w-16 animate-pulse rounded bg-black/5 dark:bg-white/10" />
              ) : (
                <AnimatedNumber value={totalProductionKg} suffix=" kg" />
              )}
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/3">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-black/50 dark:text-white/50">Avg Hive Health Score</p>
              <LivePulse color="emerald" />
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-black/5 dark:bg-white/10" />
              ) : (
                <AnimatedNumber value={avgHealth} suffix="%" />
              )}
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/3">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-black/50 dark:text-white/50">Active Alerts</p>
              {activeAlerts > 0 && <LivePulse color="rose" />}
            </div>
            <p className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? (
                <span className="inline-block h-7 w-10 animate-pulse rounded bg-black/5 dark:bg-white/10" />
              ) : (
                <AnimatedNumber value={activeAlerts} />
              )}
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/3">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-black/50 dark:text-white/50">Verified Batches</p>
              <LivePulse color="blue" />
            </div>
            <p className="mt-3 text-2xl font-bold text-honey">
              {loading ? (
                <span className="inline-block h-7 w-10 animate-pulse rounded bg-black/5 dark:bg-white/10" />
              ) : (
                <AnimatedNumber value={verifiedBatches} />
              )}
            </p>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Main chart */}
      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <IconChartBar size={20} className="text-honey" />
              <h2 className="font-semibold">
                {clusters.length > 0 ? "Regional Cluster Operations" : "Batch Lifecycle Breakdown"}
              </h2>
            </div>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              {clusters.length > 0
                ? "Total apiary facilities and active hives distributed by production cluster."
                : "Aggregated count of batches across each stage of the Honey Chain ledger."}
            </p>
          </div>

          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
            Live Network Data
          </span>
        </div>

        {loading ? (
          <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10">
            <IconLoader2 size={24} className="animate-spin text-honey" />
          </div>
        ) : (
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "#121212",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Hives" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                {clusters.length > 0 && (
                  <Bar dataKey="Apiaries" fill="#10b981" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Insights Cards */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <IconHexagon size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Hive Health Overview</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            {stats ? (
              <>
                <strong className="text-black dark:text-white">{stats.hives.healthy}</strong> out of{" "}
                <strong className="text-black dark:text-white">{stats.hives.total}</strong> hives are in optimal condition ({avgHealth}% average health index).
              </>
            ) : (
              "AI-based colony health models continually score hive acoustic, mass, and microclimate parameters."
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconTrendingUp size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Production & Yield</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            {stats ? (
              <>
                <strong className="text-black dark:text-white">{totalProductionKg} kg</strong> of honey registered across{" "}
                <strong className="text-black dark:text-white">{stats.batches.total}</strong> on-chain batches and{" "}
                <strong className="text-black dark:text-white">{stats.harvests.total}</strong> apiary extractions.
              </>
            ) : (
              "Harvest extractions are connected to verified blockchain batches for provenance tracking."
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <IconAlertTriangle size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Risk & Anomaly Signals</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            {stats ? (
              <>
                <strong className="text-black dark:text-white">{stats.alerts.active}</strong> active alerts requiring review (
                <strong className="text-red-500">{stats.alerts.critical} critical</strong>,{" "}
                <strong className="text-amber-500">{stats.alerts.warning} warning</strong>).
              </>
            ) : (
              "Anomalies and hive risk indicators can be monitored from telemetry and AI predictions."
            )}
          </p>
        </div>
      </div>

      {/* Related monitoring */}
      <div className="mt-6 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Monitor hive-level AI signals</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Inspect time-series telemetry charts, spectrograms, and colony health scores for individual hives.
            </p>
          </div>

          <Link
            href="/authority/hives"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View hives
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}