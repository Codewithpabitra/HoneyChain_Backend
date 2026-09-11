"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  IconArrowRight,
  IconBox,
  IconExternalLink,
  IconHexagon,
  IconLoader2,
  IconPackage,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

import { harvestService } from "@/services/harvest.service";
import type { Harvest } from "@/types/harvest";

export default function ProcessorHarvestsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "batched" | "pending">("all");

  async function loadHarvests() {
    try {
      setLoading(true);
      setError(null);
      const res = await harvestService.getAll();
      setHarvests(res.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load incoming harvests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHarvests();
  }, []);

  const filteredHarvests = useMemo(() => {
    return harvests.filter((h) => {
      const matchesSearch =
        search === "" ||
        h.harvestId?.toLowerCase().includes(search.toLowerCase()) ||
        h.hiveId?.toLowerCase().includes(search.toLowerCase()) ||
        h.floralOrigin?.toLowerCase().includes(search.toLowerCase()) ||
        h.batchId?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "batched"
          ? Boolean(h.batchId)
          : !h.batchId;

      return matchesSearch && matchesFilter;
    });
  }, [harvests, search, filter]);

  const totalKg = (
    harvests.reduce((sum, h) => sum + (h.quantityGrams || 0), 0) / 1000
  ).toFixed(1);
  const batchedCount = harvests.filter((h) => h.batchId).length;
  const pendingCount = harvests.length - batchedCount;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Incoming Honey
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Harvests Received
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Review raw honey extractions received from beekeepers and verify their origin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadHarvests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/5"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            href="/processor/batches"
            className="inline-flex items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            <IconBox size={18} />
            View batches
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconPackage size={20} />}
          label="Total Extractions"
          value={loading ? "..." : String(harvests.length)}
        />
        <StatCard
          icon={<IconBox size={20} />}
          label="Total Yield Received"
          value={loading ? "..." : `${totalKg} kg`}
        />
        <StatCard
          icon={<IconHexagon size={20} />}
          label="Batched & Registered"
          value={loading ? "..." : String(batchedCount)}
        />
        <StatCard
          icon={<IconPackage size={20} />}
          label="Pending Batching"
          value={loading ? "..." : String(pendingCount)}
        />
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <IconSearch
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hive ID, floral origin, batch..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/25"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/3 p-1 dark:border-white/10 dark:bg-white/3">
          {(
            [
              { key: "all", label: "All Harvests" },
              { key: "batched", label: "Batched" },
              { key: "pending", label: "Unbatched" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === t.key
                  ? "bg-white text-black shadow-xs dark:bg-white/10 dark:text-white"
                  : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Harvests List / Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading harvests from apiaries…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-500">
          {error}
        </div>
      ) : filteredHarvests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white/40 p-10 text-center dark:border-white/10 dark:bg-white/2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconPackage size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            {search ? "No matching harvests" : "No harvests found"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search terms or filter."
              : "Incoming honey extractions recorded by beekeepers will automatically appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Extraction Date</th>
                  <th className="px-5 py-3.5">Source Hive</th>
                  <th className="px-5 py-3.5">Floral Origin</th>
                  <th className="px-5 py-3.5">Yield (kg)</th>
                  <th className="px-5 py-3.5">Batch Assignment</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredHarvests.map((h) => {
                  const harvestDate = h.harvestTimestamp
                    ? new Date(
                        h.harvestTimestamp > 10000000000
                          ? h.harvestTimestamp
                          : h.harvestTimestamp * 1000
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  const yieldKg = ((h.quantityGrams || 0) / 1000).toFixed(1);

                  return (
                    <tr
                      key={h._id || h.harvestId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-5 py-4 font-medium text-black dark:text-white">
                        {harvestDate}
                        {h.harvestId && (
                          <div className="font-mono text-[10px] text-black/40 dark:text-white/40">
                            {h.harvestId}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-medium text-honey">
                          {h.hiveId}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-black/80 dark:text-white/80">
                        {h.floralOrigin || "Multifloral"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-black dark:text-white">
                        {yieldKg} kg
                      </td>
                      <td className="px-5 py-4">
                        {h.batchId ? (
                          <Link
                            href={`/verify/${encodeURIComponent(h.batchId)}`}
                            className="inline-flex items-center gap-1 font-mono text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            {h.batchId}
                            <IconExternalLink size={12} />
                          </Link>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            Pending Batch
                          </span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-4 text-xs text-black/50 dark:text-white/50">
                        {h.notes || "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {h.batchId ? (
                          <Link
                            href={`/verify/${encodeURIComponent(h.batchId)}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-honey hover:underline"
                          >
                            Trace
                            <IconArrowRight size={14} />
                          </Link>
                        ) : (
                          <Link
                            href="/farmer/batches/new"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-honey hover:underline"
                          >
                            Create batch
                            <IconArrowRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
          {icon}
        </div>

        <div>
          <p className="text-xs text-black/40 dark:text-white/40">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}