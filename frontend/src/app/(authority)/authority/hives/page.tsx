"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowUpRight,
  IconChevronRight,
  IconExternalLink,
  IconHexagon,
  IconLoader2,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";

import { hiveService } from "@/services/hive.service";
import { analyticsService } from "@/services/analytics.service";
import type { Hive } from "@/types/hive";
import type { DashboardStats } from "@/types/analytics";
import { refreshWithFeedback } from "@/lib/refresh";

export default function AuthorityHivesPage() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [hivesRes, statsRes] = await Promise.allSettled([
        hiveService.getAll(),
        analyticsService.getDashboardStats(),
      ]);

      if (hivesRes.status === "fulfilled") {
        setHives(hivesRes.value.data || []);
      } else {
        setError("Failed to load hive records from backend.");
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading hives.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredHives = useMemo(() => {
    return hives.filter((hive) => {
      const matchesSearch =
        search === "" ||
        hive.hiveId?.toLowerCase().includes(search.toLowerCase()) ||
        hive.apiaryId?.toLowerCase().includes(search.toLowerCase()) ||
        hive.beeSpecies?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || hive.status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [hives, search, statusFilter]);

  const totalHives = stats?.hives.total ?? hives.length;
  const healthyHives = stats?.hives.healthy ?? hives.filter((h) => (h.currentHealthSummary?.healthScore ?? 0) >= 70).length;
  const atRiskHives = hives.filter((h) => h.status === "quarantined" || (h.currentHealthSummary?.healthScore ?? 100) < 50).length;
  const inactiveHives = stats?.hives.inactive ?? hives.filter((h) => h.status === "inactive" || h.status === "collapsed").length;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Hive Monitoring & Oversight
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Hives</h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Monitor hive health, telemetry and AI-based risk indicators across registered apiaries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshWithFeedback(loadData)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Total Hives</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : totalHives}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Healthy Hives</p>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : healthyHives}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">At Risk / Quarantined</p>
          <p className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {loading ? "..." : atRiskHives}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Inactive Colonies</p>
          <p className="mt-3 text-2xl font-bold text-black/40 dark:text-white/40">
            {loading ? "..." : inactiveHives}
          </p>
        </div>
      </div>

      {/* Search and Filter Tabs */}
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
            placeholder="Search by hive ID, apiary ID, species..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/25"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-black/3 p-1 dark:border-white/10 dark:bg-white/3">
          {["ALL", "Active", "Quarantined", "Inactive"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === tab
                  ? "bg-white text-black shadow-xs dark:bg-white/10 dark:text-white"
                  : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Hives Table */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading hive registry…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-500">
          {error}
        </div>
      ) : filteredHives.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconHexagon size={28} stroke={1.6} />
          </div>

          <h2 className="mt-5 font-semibold">
            {search ? "No matching hives found" : "No hive data available"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search criteria or filter."
              : "Registered hives will appear here as soon as beekeepers onboard them."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Hive ID</th>
                  <th className="px-5 py-3.5">Apiary / Location</th>
                  <th className="px-5 py-3.5">Bee Species</th>
                  <th className="px-5 py-3.5">Health Score</th>
                  <th className="px-5 py-3.5">Queen Age</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredHives.map((h) => {
                  const score = h.currentHealthSummary?.healthScore ?? 85;
                  const isHighRisk = score < 60;

                  return (
                    <tr
                      key={h._id || h.hiveId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono font-semibold text-black dark:text-white">
                          {h.hiveId}
                        </div>
                        {h.deviceMetadata?.gatewayId && (
                          <div className="text-[10px] text-black/40 dark:text-white/40">
                            Gateway: {h.deviceMetadata.gatewayId}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-honey">
                        {h.apiaryId}
                      </td>
                      <td className="px-5 py-4 text-black/75 dark:text-white/75">
                        {h.beeSpecies || "Apis mellifera"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              score >= 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : score >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {score}%
                          </span>
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              className={`h-full ${
                                score >= 80
                                  ? "bg-emerald-500"
                                  : score >= 60
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-black/60 dark:text-white/60">
                        {h.queenInfo?.ageMonths ? `${h.queenInfo.ageMonths} months` : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            h.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : h.status === "quarantined"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/farmer/hives/${encodeURIComponent(h.hiveId)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                        >
                          Telemetry
                          <IconExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monitoring note */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <IconActivity size={19} className="text-honey" />
              <p className="font-semibold">Telemetry & AI Monitoring</p>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50 dark:text-white/50">
              Hive telemetry can be analysed for environmental anomalies and AI-based colony health risk indicators.
            </p>
          </div>

          <Link
            href="/authority/analytics"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View analytics
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}