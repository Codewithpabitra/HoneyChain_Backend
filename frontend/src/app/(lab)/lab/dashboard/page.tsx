// src/app/(lab)/lab/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconClipboardCheck,
  IconDroplet,
  IconExternalLink,
  IconFileDescription,
  IconFlask,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { batchService } from "@/services/batch.service";
import { analyticsService } from "@/services/analytics.service";
import type { BatchItem } from "@/types/batch";
import type { DashboardStats } from "@/types/analytics";

export default function LabDashboardPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"PENDING" | "CERTIFIED" | "ALL">("PENDING");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, statsRes] = await Promise.allSettled([
        batchService.getAll(),
        analyticsService.getDashboardStats(),
      ]);

      if (batchRes.status === "fulfilled") {
        setBatches(batchRes.value.data || []);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load lab dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics
  const pendingBatches = useMemo(
    () => batches.filter((b) => b.status === "Registered"),
    [batches]
  );

  const certifiedBatches = useMemo(
    () =>
      batches.filter(
        (b) => b.quality && b.quality.grade && b.quality.grade !== "None"
      ),
    [batches]
  );

  const avgMoisture = useMemo(() => {
    const tested = batches.filter(
      (b) =>
        b.quality &&
        typeof b.quality.moisturePercentage === "number" &&
        b.quality.moisturePercentage > 0
    );
    if (tested.length === 0) return 17.5; // Standard benchmark
    const sum = tested.reduce(
      (acc, b) => acc + (b.quality?.moisturePercentage ?? 0),
      0
    );
    return Number((sum / tested.length).toFixed(1));
  }, [batches]);

  const reportsGenerated = useMemo(
    () =>
      batches.filter(
        (b) => Boolean(b.quality?.labReportHash) || Boolean(b.quality?.labReportUrl)
      ).length,
    [batches]
  );

  // Grade breakdown
  const gradeCounts = useMemo(() => {
    const counts = { GradeA: 0, GradeB: 0, GradeC: 0, Substandard: 0 };
    certifiedBatches.forEach((b) => {
      const g = b.quality?.grade;
      if (g && g in counts) {
        counts[g as keyof typeof counts]++;
      }
    });
    return counts;
  }, [certifiedBatches]);

  const displayedBatches = useMemo(() => {
    if (filterTab === "PENDING") return pendingBatches;
    if (filterTab === "CERTIFIED") return certifiedBatches;
    return batches;
  }, [filterTab, pendingBatches, certifiedBatches, batches]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-honey">
            Quality Assurance & Certification
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome, {user?.name ?? "Laboratory Analyst"}
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Assay incoming raw honey extractions, record physicochemical parameters, and publish cryptographic quality certificates to the blockchain.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark dark:hover:bg-white/8"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            href="/lab/tests/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb transition hover:brightness-95"
          >
            <IconPlus size={18} />
            New Assay Test
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black/50 dark:text-white/50">Awaiting Testing</p>
              <p className="mt-2 text-2xl font-bold">
                {loading ? "—" : pendingBatches.length}
              </p>
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Pending laboratory evaluation
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <IconFlask size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black/50 dark:text-white/50">Certified Batches</p>
              <p className="mt-2 text-2xl font-bold">
                {loading ? "—" : certifiedBatches.length}
              </p>
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                Quality grades published
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <IconShieldCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black/50 dark:text-white/50">Average Moisture</p>
              <p className="mt-2 text-2xl font-bold">
                {loading ? "—" : `${avgMoisture}%`}
              </p>
              <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                Target: &lt; 20.0% Codex standard
              </p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <IconDroplet size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black/50 dark:text-white/50">Reports Published</p>
              <p className="mt-2 text-2xl font-bold">
                {loading ? "—" : reportsGenerated}
              </p>
              <p className="mt-1 text-[11px] text-honey">
                Cryptographic PDF SHA-256
              </p>
            </div>
            <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
              <IconClipboardCheck size={22} />
            </div>
          </div>
        </div>
      </section>

      {/* Quality Grade Compliance Guidelines */}
      <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-ink dark:text-ink-dark">
              Quality Grade Compliance Standards
            </h2>
            <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
              Assay benchmarks defined under Codex Alimentarius &amp; FSSAI Honey Guidelines.
            </p>
          </div>

          <Link
            href="/lab/tests/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-honey hover:underline"
          >
            Submit New Assay Report
            <IconArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Grade A
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {gradeCounts.GradeA} batches
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-ink dark:text-ink-dark">
              Premium Pure Honey
            </p>
            <p className="mt-1 text-[11px] text-black/50 dark:text-white/50">
              Moisture &le; 18.0%, zero adulteration, premium aroma &amp; clarity.
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                Grade B
              </span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                {gradeCounts.GradeB} batches
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-ink dark:text-ink-dark">
              Standard Table Honey
            </p>
            <p className="mt-1 text-[11px] text-black/50 dark:text-white/50">
              Moisture &le; 19.0%, standard consumer table grade honey.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                Grade C
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {gradeCounts.GradeC} batches
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-ink dark:text-ink-dark">
              Commercial / Processing Grade
            </p>
            <p className="mt-1 text-[11px] text-black/50 dark:text-white/50">
              Moisture &le; 20.0%, suitable for commercial food processing.
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-300">
                Substandard
              </span>
              <span className="text-xs font-bold text-red-700 dark:text-red-300">
                {gradeCounts.Substandard} batches
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-ink dark:text-ink-dark">
              Non-Compliant
            </p>
            <p className="mt-1 text-[11px] text-black/50 dark:text-white/50">
              Moisture &gt; 20.0%, high fermentation risk or non-compliant parameters.
            </p>
          </div>
        </div>
      </section>

      {/* Batch Testing Ledger Table */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <IconFlask size={20} className="text-honey" />
              <h2 className="text-lg font-bold tracking-tight">
                Assay Testing Queue &amp; History
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
              Select any registered honey batch to perform laboratory analysis or view certified reports.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-black/3 p-1 dark:border-white/10 dark:bg-white/3">
            <button
              type="button"
              onClick={() => setFilterTab("PENDING")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterTab === "PENDING"
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              Awaiting Assay ({pendingBatches.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("CERTIFIED")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterTab === "CERTIFIED"
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              Certified ({certifiedBatches.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterTab === "ALL"
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              All ({batches.length})
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-black/50 dark:text-white/50">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
              Loading batch testing queue…
            </div>
          ) : displayedBatches.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/10 text-honey">
                <IconFlask size={24} />
              </div>
              <h3 className="mt-4 font-semibold text-ink dark:text-ink-dark">
                No batches found
              </h3>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                {filterTab === "PENDING"
                  ? "All available honey batches have been certified."
                  : "No batches match the selected criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                  <tr>
                    <th className="px-5 py-3.5">Batch Reference</th>
                    <th className="px-5 py-3.5">Floral Origin</th>
                    <th className="px-5 py-3.5">Harvested</th>
                    <th className="px-5 py-3.5">Quantity</th>
                    <th className="px-5 py-3.5">Moisture</th>
                    <th className="px-5 py-3.5">Grade</th>
                    <th className="px-5 py-3.5">Certificate</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {displayedBatches.map((batch) => {
                    const isTested =
                      batch.quality &&
                      batch.quality.grade &&
                      batch.quality.grade !== "None";

                    return (
                      <tr
                        key={batch.batchId}
                        className="transition hover:bg-black/1 dark:hover:bg-white/1"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-ink dark:text-ink-dark">
                            {batch.batchId}
                          </span>
                          {batch.apiaryLocation?.region && (
                            <div className="text-xs text-black/40 dark:text-white/40">
                              {batch.apiaryLocation.region}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-medium text-ink dark:text-ink-dark">
                          {batch.floralOrigin}
                        </td>

                        <td className="px-5 py-4 text-xs text-black/50 dark:text-white/50">
                          {new Date(batch.harvestTimestamp).toLocaleDateString()}
                        </td>

                        <td className="px-5 py-4 font-medium text-ink dark:text-ink-dark">
                          {((batch.quantityGrams || 0) / 1000).toFixed(1)} kg
                        </td>

                        <td className="px-5 py-4">
                          {typeof batch.quality?.moisturePercentage === "number" ? (
                            <span
                              className={`font-semibold ${
                                batch.quality.moisturePercentage <= 18
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : batch.quality.moisturePercentage <= 20
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-500"
                              }`}
                            >
                              {batch.quality.moisturePercentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-black/40 dark:text-white/40">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isTested && batch.quality?.grade ? (
                            <GradeBadge grade={batch.quality.grade} />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                              Awaiting Assay
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {batch.quality?.labReportUrl ? (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${batch.quality.labReportUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-honey hover:underline"
                            >
                              <IconFileDescription size={14} />
                              PDF
                              <IconExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-xs text-black/40 dark:text-white/40">None</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isTested ? (
                            <Link
                              href={`/traceability/${encodeURIComponent(batch.batchId)}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-honey hover:text-honey dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
                            >
                              Trace Log
                              <IconArrowRight size={13} />
                            </Link>
                          ) : (
                            <Link
                              href={`/lab/tests/new?batchId=${encodeURIComponent(batch.batchId)}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-honey px-3 py-1.5 text-xs font-semibold text-comb transition hover:brightness-95"
                            >
                              <IconFlask size={14} />
                              Run Assay
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* On-Chain Security Guarantee Banner */}
      <div className="rounded-2xl border border-honey/20 bg-honey/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-honey/15 p-2.5 text-honey">
              <IconShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-ink dark:text-ink-dark">
                Cryptographic Quality Assurance Guarantee
              </h3>
              <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                Every certified report undergoes SHA-256 digital fingerprinting and immutable on-chain registration via HoneyChain’s Ethereum Sepolia smart contract. Once registered, quality parameters cannot be altered or falsified.
              </p>
            </div>
          </div>

          <Link
            href="/lab/tests"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-honey hover:text-honey dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
          >
            All Certified Batches
            <IconArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  if (grade === "GradeA") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <IconCheck size={12} stroke={2.5} />
        Grade A
      </span>
    );
  }
  if (grade === "GradeB") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
        Grade B
      </span>
    );
  }
  if (grade === "GradeC") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
        Grade C
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
      Substandard
    </span>
  );
}
