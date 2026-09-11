"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowUpRight,
  IconBuildingCommunity,
  IconHexagon,
  IconLoader2,
  IconMap,
  IconMapPin,
  IconRefresh,
  IconRoute,
  IconUsers,
} from "@tabler/icons-react";

import { analyticsService } from "@/services/analytics.service";
import type { ClusterInfo } from "@/types/analytics";

export default function AuthorityClustersPage() {
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadClusters() {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getClusters();
      setClusters(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cluster analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClusters();
  }, []);

  const totalApiariesCovered = clusters.reduce(
    (sum, c) => sum + (c.apiaryCount ?? c.totalApiaries ?? 0),
    0
  );
  const totalHivesCovered = clusters.reduce((sum, c) => sum + (c.totalHives || 0), 0);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Regional Operations & Aggregation
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Apiary Clusters</h1>

          <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
            Monitor beekeeping clusters, regional operational distribution and apiary health aggregates.
          </p>
        </div>

        <button
          type="button"
          onClick={loadClusters}
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
          <p className="text-sm text-black/50 dark:text-white/50">Active Clusters</p>
          <p className="mt-3 text-2xl font-bold text-honey">{loading ? "..." : clusters.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Apiaries Covered</p>
          <p className="mt-3 text-2xl font-bold">{loading ? "..." : totalApiariesCovered}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Hives Monitored</p>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : totalHivesCovered}
          </p>
        </div>
      </div>

      {/* Cluster Cards Grid */}
      {loading ? (
        <div className="mt-8 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading regional clusters…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-500">
          {error}
        </div>
      ) : clusters.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconMap size={28} stroke={1.6} />
          </div>

          <h2 className="mt-5 font-semibold">No cluster data available</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            Regional cluster aggregations will appear as soon as apiaries with assigned regions are onboarded.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {clusters.map((cluster, idx) => {
            const clusterName = cluster.region || cluster.cluster || `Cluster ${idx + 1}`;
            const apiariesNum = cluster.apiaryCount ?? cluster.totalApiaries ?? 0;

            return (
              <div
                key={clusterName}
                className="rounded-2xl border border-black/10 bg-white p-6 transition hover:border-honey/40 dark:border-white/10 dark:bg-white/3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey/10 text-honey">
                      <IconMapPin size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{clusterName}</h3>
                      <p className="text-xs text-black/40 dark:text-white/40">
                        Regional Production Zone
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 text-right">
                    <div className="rounded-xl border border-black/5 bg-black/2 px-3 py-1.5 text-center dark:border-white/5 dark:bg-white/2">
                      <span className="block text-xs text-black/40 dark:text-white/40">Apiaries</span>
                      <span className="font-bold text-sm">{apiariesNum}</span>
                    </div>
                    <div className="rounded-xl border border-black/5 bg-black/2 px-3 py-1.5 text-center dark:border-white/5 dark:bg-white/2">
                      <span className="block text-xs text-black/40 dark:text-white/40">Hives</span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {cluster.totalHives}
                      </span>
                    </div>
                  </div>
                </div>

              {/* Apiaries in this cluster */}
              <div className="mt-6 border-t border-black/5 pt-4 dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
                  Contributing Apiaries
                </p>

                <div className="space-y-2">
                  {cluster.apiaries?.slice(0, 4).map((apiary) => (
                    <div
                      key={apiary.apiaryId}
                      className="flex items-center justify-between rounded-xl bg-black/2 px-3.5 py-2 text-xs dark:bg-white/2"
                    >
                      <div>
                        <span className="font-medium text-black dark:text-white">
                          {apiary.name}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-black/40 dark:text-white/40">
                          {apiary.apiaryId}
                        </span>
                      </div>
                      <span className="font-semibold text-honey">
                        {apiary.hiveCount ?? 0} hives
                      </span>
                    </div>
                  ))}

                  {(cluster.apiaries?.length || 0) > 4 && (
                    <p className="text-center text-xs text-black/40 dark:text-white/40 pt-1">
                      + {(cluster.apiaries?.length || 0) - 4} more apiaries
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Link
                  href="/authority/farmers"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-honey hover:underline"
                >
                  View cluster beekeepers
                  <IconArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Coverage & Traceability links */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconUsers size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Farmer Coverage</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Track beekeeper participation and operational coverage across registered clusters.
          </p>

          <Link
            href="/authority/farmers"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View farmers
            <IconArrowUpRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconRoute size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Regional Traceability</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Connect regional production activity with blockchain-backed honey traceability records.
          </p>

          <Link
            href="/authority/blockchain"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View blockchain
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}