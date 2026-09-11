"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  IconArrowUpRight,
  IconBuildingCommunity,
  IconHexagon,
  IconLoader2,
  IconMapPin,
  IconRefresh,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";

import { apiaryService } from "@/services/apiary.service";
import { analyticsService } from "@/services/analytics.service";
import type { Apiary } from "@/types/apiary";
import type { ClusterInfo } from "@/types/analytics";

export default function AuthorityFarmersPage() {
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [apiaryRes, clusterRes] = await Promise.allSettled([
        apiaryService.getAll(),
        analyticsService.getClusters(),
      ]);

      if (apiaryRes.status === "fulfilled") {
        setApiaries(apiaryRes.value.data || []);
      } else {
        setError("Failed to load apiaries from backend.");
      }

      if (clusterRes.status === "fulfilled") {
        setClusters(clusterRes.value.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading beekeeper data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredApiaries = useMemo(() => {
    return apiaries.filter((a) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.name?.toLowerCase().includes(q) ||
        a.apiaryId?.toLowerCase().includes(q) ||
        a.location?.region?.toLowerCase().includes(q) ||
        a.location?.address?.toLowerCase().includes(q) ||
        a.cluster?.toLowerCase().includes(q)
      );
    });
  }, [apiaries, search]);

  const totalApiaries = apiaries.length;
  const activeApiaries = apiaries.filter((a) => a.status !== "inactive").length;
  const clusterCount = clusters.length > 0 ? clusters.length : new Set(apiaries.map((a) => a.location?.region || a.cluster).filter(Boolean)).size;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Beekeeper & Apiary Network
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Farmers & Apiaries</h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Monitor registered beekeepers, apiary facilities, and regional cluster coverage.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
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
          <p className="text-sm text-black/50 dark:text-white/50">Registered Apiaries</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : totalApiaries}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Active Apiary Operations</p>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : activeApiaries}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Regional Clusters</p>
          <p className="mt-3 text-2xl font-bold text-honey">
            {loading ? "..." : clusterCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/3">
        <IconSearch
          size={19}
          className="shrink-0 text-black/30 dark:text-white/30"
        />

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by apiary name, ID, region, or cluster..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
        />
      </div>

      {/* Apiaries Table / Empty State */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading apiary directory…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-500">
          {error}
        </div>
      ) : filteredApiaries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconUsers size={27} stroke={1.6} />
          </div>

          <h2 className="mt-5 font-semibold">
            {search ? "No matching apiaries found" : "No apiary records available"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search criteria."
              : "Registered apiary operations will appear here as soon as beekeepers create them."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Apiary Name</th>
                  <th className="px-5 py-3.5">Apiary ID</th>
                  <th className="px-5 py-3.5">Region / Cluster</th>
                  <th className="px-5 py-3.5">Hives Assigned</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredApiaries.map((apiary) => (
                  <tr
                    key={apiary._id || apiary.apiaryId}
                    className="transition hover:bg-black/1 dark:hover:bg-white/1"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-black dark:text-white">
                        {apiary.name}
                      </div>
                      {apiary.location?.address && (
                        <div className="text-xs text-black/40 dark:text-white/40">
                          {apiary.location.address}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-honey">
                      {apiary.apiaryId}
                    </td>
                    <td className="px-5 py-4 text-black/75 dark:text-white/75">
                      <div className="flex items-center gap-1.5">
                        <IconMapPin size={14} className="text-honey shrink-0" />
                        <span>{apiary.location?.region || apiary.cluster || "General Region"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-black dark:text-white">
                      {apiary.hiveCount ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          apiary.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60"
                        }`}
                      >
                        {apiary.status || "active"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href="/authority/hives"
                        className="inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                      >
                        Inspect Hives
                        <IconArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related module */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Need hive-level monitoring?</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              View individual hive telemetry, health scores and AI sensor readings across these apiaries.
            </p>
          </div>

          <Link
            href="/authority/hives"
            className="inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View hives
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}