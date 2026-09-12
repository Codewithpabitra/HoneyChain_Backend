// src/app/(lab)/lab/tests/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconClipboardCheck,
  IconFileDescription,
  IconFlask,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import type { BatchItem } from "@/types/batch";
import { resolveLabReportUrl } from "@/lib/utils";

export default function LabTestsPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"PENDING" | "CERTIFIED" | "ALL">("PENDING");
  const [search, setSearch] = useState("");

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await batchService.getAll();
      setBatches(res.data || []);
    } catch {
      setError("Failed to load batches from registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const stats = useMemo(() => {
    const completed = batches.filter(
      (b) => b.quality && b.quality.grade && b.quality.grade !== "None"
    ).length;
    const pending = batches.filter((b) => b.status === "Registered").length;
    const certifiedTotal = batches.filter((b) => b.status === "Certified").length;
    return { completed, pending, certifiedTotal };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    let list = batches;
    if (activeTab === "PENDING") {
      list = list.filter((b) => b.status === "Registered");
    } else if (activeTab === "CERTIFIED") {
      list = list.filter(
        (b) => b.quality && b.quality.grade && b.quality.grade !== "None"
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.batchId.toLowerCase().includes(q) ||
          b.floralOrigin.toLowerCase().includes(q)
      );
    }

    return list;
  }, [batches, activeTab, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Quality Assurance & Certification
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
            Laboratory Quality Tests
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Assay honey batches, record moisture content, issue grades, and publish certified PDF lab reports on Ethereum Sepolia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBatches}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            href="/lab/tests/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb shadow-xs transition hover:brightness-95"
          >
            <IconPlus size={18} />
            New Quality Test
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-black/50 dark:text-white/50">Pending Certification</p>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {loading ? "—" : stats.pending}
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
              <p className="text-sm text-black/50 dark:text-white/50">Tests Completed</p>
              <p className="mt-2 text-2xl font-bold text-ink dark:text-ink-dark">
                {loading ? "—" : stats.completed}
              </p>
            </div>
            <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
              <IconClipboardCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-black/50 dark:text-white/50">Certified On-Chain</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {loading ? "—" : stats.certifiedTotal}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <IconShieldCheck size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
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
            placeholder="Search batches by ID or flora..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/3"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
          {(["PENDING", "CERTIFIED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              {tab === "PENDING"
                ? `Awaiting Testing (${stats.pending})`
                : tab === "CERTIFIED"
                ? "Certified"
                : "All Batches"}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
          Loading quality testing pipeline…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-alert/20 bg-alert/5 p-6 text-center text-sm text-alert">
          {error}
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-12 text-center dark:border-white/10 dark:bg-white/3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconFlask size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-ink dark:text-ink-dark">
            {activeTab === "PENDING"
              ? "No batches awaiting certification"
              : "No quality tests found"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
            {activeTab === "PENDING"
              ? "All registered honey batches have been processed or none are currently queued for laboratory assay."
              : "Start a quality test by entering a registered honey batch ID."}
          </p>

          <Link
            href="/lab/tests/new"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
          >
            Perform a quality test
            <IconArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Batch</th>
                  <th className="px-5 py-3.5">Floral Origin</th>
                  <th className="px-5 py-3.5">Yield</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Quality Grade</th>
                  <th className="px-5 py-3.5">Moisture</th>
                  <th className="px-5 py-3.5">Certificate PDF</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredBatches.map((batch) => {
                  const isCertified =
                    batch.quality &&
                    batch.quality.grade &&
                    batch.quality.grade !== "None";
                  const reportUrl = batch.quality?.labReportUrl;

                  return (
                    <tr
                      key={batch._id || batch.batchId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono font-semibold text-ink dark:text-ink-dark">
                          {batch.batchId}
                        </div>
                        <div className="text-xs text-black/40 dark:text-white/40">
                          {new Date(
                            batch.harvestTimestamp > 10000000000
                              ? batch.harvestTimestamp
                              : batch.harvestTimestamp * 1000
                          ).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-black/75 dark:text-white/75">
                        {batch.floralOrigin}
                      </td>

                      <td className="px-5 py-4 font-semibold text-ink dark:text-ink-dark">
                        {(batch.quantityGrams / 1000).toFixed(1)} kg
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            batch.status === "Certified"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {isCertified ? (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {batch.quality!.grade.replace("Grade", "Grade ")}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Awaiting Test
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs font-mono text-black/60 dark:text-white/60">
                        {batch.quality?.moisturePercentage !== undefined
                          ? `${batch.quality.moisturePercentage}%`
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        {reportUrl ? (
                          <a
                            href={resolveLabReportUrl(reportUrl, batch.batchId)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs font-medium text-honey hover:underline"
                            title={batch.quality?.labReportHash}
                          >
                            <IconFileDescription size={14} />
                            View PDF
                          </a>
                        ) : batch.quality?.labReportHash ? (
                          <span className="font-mono text-[10px] text-black/40 dark:text-white/40">
                            Hash: {batch.quality.labReportHash.slice(0, 8)}…
                          </span>
                        ) : (
                          <span className="text-xs text-black/35 dark:text-white/35">None</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {batch.status === "Registered" ? (
                          <Link
                            href={`/lab/tests/new?batchId=${encodeURIComponent(batch.batchId)}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-honey px-3 py-1.5 text-xs font-semibold text-comb shadow-2xs transition hover:brightness-95"
                          >
                            Certify Batch
                            <IconArrowRight size={13} />
                          </Link>
                        ) : (
                          <Link
                            href={`/traceability/${encodeURIComponent(batch.batchId)}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                          >
                            Trace Record
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