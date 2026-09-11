// src/app/(farmer)/farmer/hives/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  IconPlus,
  IconHexagon,
  IconSearch,
  IconChevronRight,
  IconBattery,
  IconActivity,
  IconAlertTriangle,
  IconRefresh,
  IconMapPin,
} from "@tabler/icons-react";

import { hiveService } from "@/services/hive.service";
import type { Hive, HiveStatus } from "@/types/hive";

export default function HivesPage() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  async function fetchHives() {
    setLoading(true);
    setError(null);
    try {
      const res = await hiveService.getAll({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setHives(res.data || []);
    } catch {
      setError("Failed to load hives. Please ensure the backend service is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHives();
  }, [statusFilter]);

  const filteredHives = useMemo(() => {
    if (!search.trim()) return hives;
    const q = search.toLowerCase();
    return hives.filter(
      (h) =>
        h.hiveId.toLowerCase().includes(q) ||
        h.beeSpecies?.toLowerCase().includes(q) ||
        (typeof h.apiary === "object" && h.apiary?.name?.toLowerCase().includes(q))
    );
  }, [hives, search]);

  const stats = useMemo(() => {
    const total = hives.length;
    const active = hives.filter((h) => h.status === "active").length;
    const healthy = hives.filter(
      (h) => h.currentHealthSummary?.status === "healthy"
    ).length;
    const attention = hives.filter(
      (h) =>
        h.currentHealthSummary?.status === "attention_needed" ||
        h.currentHealthSummary?.status === "critical"
    ).length;
    return { total, active, healthy, attention };
  }, [hives]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Apiary Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            My Hives
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Monitor and manage all your connected hives, hardware telemetry, and colony health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchHives}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark dark:hover:bg-white/8"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            href="/farmer/hives/new"
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb transition hover:brightness-95"
          >
            <IconPlus size={18} />
            Add Hive
          </Link>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Total Hives</p>
          <p className="mt-2 text-2xl font-bold">{loading ? "—" : stats.total}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Active Colonies</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : stats.active}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Healthy Condition</p>
          <p className="mt-2 text-2xl font-bold text-honey">
            {loading ? "—" : stats.healthy}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Requires Attention</p>
          <p className="mt-2 text-2xl font-bold text-alert">
            {loading ? "—" : stats.attention}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <IconSearch
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Hive ID, species, or apiary..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/3"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
          {(["ALL", "active", "inactive", "quarantined"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === tab
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              {tab === "ALL" ? "All Hives" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
          Loading hives from registry…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between rounded-2xl border border-alert/20 bg-alert/5 p-6 text-sm text-alert">
          <div className="flex items-center gap-3">
            <IconAlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchHives}
            className="rounded-lg bg-alert/10 px-3 py-1.5 text-xs font-semibold hover:bg-alert/20"
          >
            Retry
          </button>
        </div>
      ) : filteredHives.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-12 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10">
            <IconHexagon size={28} className="text-honey" />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            {search ? "No matching hives found" : "No hives connected yet"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search criteria or filter."
              : "Add your first hive to start monitoring colony health, environmental conditions, and AI-powered insights."}
          </p>

          {!search && (
            <Link
              href="/farmer/hives/new"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-honey hover:underline"
            >
              Add your first hive
              <IconChevronRight size={17} />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHives.map((hive) => {
            const apiaryName =
              typeof hive.apiary === "object" ? hive.apiary?.name : hive.apiaryId;
            const region =
              typeof hive.apiary === "object" ? hive.apiary?.location?.region : undefined;
            const healthScore = hive.currentHealthSummary?.healthScore ?? 100;
            const healthStatus = hive.currentHealthSummary?.status || "healthy";
            const battery = hive.deviceMetadata?.batteryLevelPct ?? null;

            return (
              <Link
                key={hive._id || hive.hiveId}
                href={`/farmer/hives/${encodeURIComponent(hive.hiveId)}`}
                className="group rounded-2xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-honey/40 hover:shadow-md dark:border-white/10 dark:bg-white/3 dark:hover:border-honey/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey/10 text-honey transition group-hover:scale-105">
                      <IconHexagon size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold tracking-tight text-ink dark:text-ink-dark">
                        {hive.hiveId}
                      </h3>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        {hive.hiveType || "Langstroth"} • {hive.beeSpecies || "Apis cerana"}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={hive.status} />
                </div>

                <div className="mt-4 space-y-2 border-t border-black/5 pt-3 dark:border-white/5">
                  {apiaryName && (
                    <div className="flex items-center gap-1.5 text-xs text-black/60 dark:text-white/60">
                      <IconMapPin size={14} className="text-honey" />
                      <span className="truncate font-medium">{apiaryName}</span>
                      {region && <span className="text-black/40 dark:text-white/40">({region})</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black/50 dark:text-white/50">Colony Health</span>
                    <span
                      className={`font-semibold ${
                        healthStatus === "healthy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : healthStatus === "attention_needed"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-alert"
                      }`}
                    >
                      {healthStatus.replace("_", " ")} ({healthScore}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black/50 dark:text-white/50">IoT Gateway</span>
                    <span className="font-mono text-[11px] text-black/60 dark:text-white/60">
                      {hive.deviceMetadata?.deviceId || `ESP32-${hive.hiveId}`}
                    </span>
                  </div>

                  {battery !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-black/50 dark:text-white/50">Device Battery</span>
                      <span className="flex items-center gap-1 font-medium text-black/70 dark:text-white/70">
                        <IconBattery size={13} className="text-honey" />
                        {battery}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs font-medium text-honey dark:border-white/5">
                  <span>View Telemetry & ML</span>
                  <IconChevronRight
                    size={15}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: HiveStatus }) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        Active
      </span>
    );
  }
  if (status === "quarantined") {
    return (
      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
        Quarantined
      </span>
    );
  }
  if (status === "collapsed") {
    return (
      <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
        Collapsed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-black/50 dark:bg-white/5 dark:text-white/50">
      Inactive
    </span>
  );
}