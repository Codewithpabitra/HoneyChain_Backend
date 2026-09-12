// src/app/(authority)/authority/audits/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconExternalLink,
  IconFileDescription,
  IconRefresh,
  IconSearch,
  IconShieldExclamation,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { batchService } from "@/services/batch.service";
import type { BatchItem } from "@/types/batch";
import { resolveLabReportUrl } from "@/lib/utils";
import { refreshWithFeedback } from "@/lib/refresh";

type FilterTab = "NEEDS_AUDIT" | "RECALLED" | "CERTIFIED" | "ALL";

export default function AuthorityAuditsPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<FilterTab>("NEEDS_AUDIT");
  const [search, setSearch] = useState("");

  // Action Modals State
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [modalMode, setModalMode] = useState<"CLEAR" | "RECALL" | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setError(null);
      const res = await batchService.getAll();
      setBatches(res.data || []);
    } catch {
      setError("Failed to fetch batches from registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      await refreshWithFeedback(fetchBatches);
    } finally {
      setRefreshing(false);
    }
  }

  // Audit Metrics
  const stats = useMemo(() => {
    const underReview = batches.filter(
      (b) => b.reviewRequest?.active && !b.reviewRequest?.resolved
    ).length;
    const recalled = batches.filter(
      (b) => b.status === "Recalled" || b.recall?.recalled
    ).length;
    const certified = batches.filter(
      (b) => b.status === "Certified" && !b.recall?.recalled
    ).length;
    const totalVolumeKg = batches.reduce(
      (acc, b) => acc + (b.quantityGrams || 0) / 1000,
      0
    );

    return { underReview, recalled, certified, totalVolumeKg };
  }, [batches]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // 1. Tab Filter
      const isUnderReview = Boolean(
        b.reviewRequest?.active && !b.reviewRequest?.resolved
      );
      const isRecalled = Boolean(b.status === "Recalled" || b.recall?.recalled);
      const isCertified = Boolean(b.status === "Certified" && !isRecalled);

      if (filterTab === "NEEDS_AUDIT" && !isUnderReview) return false;
      if (filterTab === "RECALLED" && !isRecalled) return false;
      if (filterTab === "CERTIFIED" && !isCertified) return false;

      // 2. Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const producerName =
        typeof b.organizationId === "object" ? b.organizationId?.name : "";
      const apiaryName =
        typeof b.apiary === "object" ? b.apiary?.name : b.apiaryId;

      return (
        b.batchId.toLowerCase().includes(q) ||
        b.floralOrigin.toLowerCase().includes(q) ||
        (producerName && producerName.toLowerCase().includes(q)) ||
        (apiaryName && apiaryName.toLowerCase().includes(q))
      );
    });
  }, [batches, filterTab, search]);

  // Action Handlers
  async function handleConfirmAction() {
    if (!selectedBatch) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (modalMode === "CLEAR") {
        const reqId = String(selectedBatch.reviewRequest?.requestId || 1);
        await batchService.clearReview(selectedBatch.batchId, reqId, {
          notes: reasonInput.trim() || "Approved by Food Safety Authority audit.",
        });
      } else if (modalMode === "RECALL") {
        if (!reasonInput.trim()) {
          setActionError("A formal regulatory recall reason is required.");
          setActionLoading(false);
          return;
        }
        await batchService.recall(selectedBatch.batchId, {
          reason: reasonInput.trim(),
          role: "auditor",
        });
      }

      // Close modal and refresh data
      setModalMode(null);
      setSelectedBatch(null);
      setReasonInput("");
      await handleManualRefresh();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Operation failed. Please check network and permissions.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-honey">
            <IconShieldExclamation size={16} />
            <span>Food Safety & Licensing Regulatory Bureau</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
            Batch Audits & Recalls
          </h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Official regulatory oversight of honey purity, compliance audits, laboratory assays, and on-chain recall governance.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark dark:hover:bg-white/8"
        >
          <IconRefresh
            size={16}
            className={loading || refreshing ? "animate-spin text-honey" : ""}
          />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {/* Regulatory Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 dark:border-amber-500/20">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Pending Audit Requests
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {loading ? "—" : stats.underReview}
          </p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Batches flagged for food safety inspection
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider">
            Quality Certified
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : stats.certified}
          </p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Accredited assays verified compliant
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 dark:border-red-500/20">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
            Enforced Recalls
          </p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {loading ? "—" : stats.recalled}
          </p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Terminal on-chain recalls issued
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider">
            Harvest Volume Inspected
          </p>
          <p className="mt-2 text-3xl font-bold text-ink dark:text-ink-dark">
            {loading ? "—" : `${stats.totalVolumeKg.toFixed(1)} kg`}
          </p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Total commercial volume audited
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <IconSearch
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Batch ID, floral origin, producer..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/3"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
          {(
            [
              { id: "NEEDS_AUDIT", label: `Review Requests (${stats.underReview})` },
              { id: "CERTIFIED", label: "Certified" },
              { id: "RECALLED", label: `Recalled (${stats.recalled})` },
              { id: "ALL", label: "All Batches" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterTab === tab.id
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark font-semibold"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xs dark:border-white/10 dark:bg-white/3">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-black/50 dark:text-white/50">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
            Loading batch audits from registry…
          </div>
        ) : error ? (
          <div className="flex items-center justify-between p-6 text-sm text-alert">
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="rounded-lg bg-alert/10 px-3 py-1.5 text-xs font-semibold hover:bg-alert/20"
            >
              Retry
            </button>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-12 text-center text-sm text-black/50 dark:text-white/50">
            {filterTab === "NEEDS_AUDIT" ? (
              <div className="mx-auto max-w-sm">
                <IconShieldCheck size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-ink dark:text-ink-dark">All Audits Cleared</p>
                <p className="mt-1 text-xs">
                  No batches currently have pending audit review requests. Supply chain quality checks are satisfied.
                </p>
              </div>
            ) : (
              "No batches match the current filter or search criteria."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/5 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Batch ID / Origin</th>
                  <th className="px-5 py-3.5">Volume</th>
                  <th className="px-5 py-3.5">Lab Assay & Grade</th>
                  <th className="px-5 py-3.5">Audit Status</th>
                  <th className="px-5 py-3.5 text-right">Regulatory Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredBatches.map((batch) => {
                  const isUnderReview = Boolean(
                    batch.reviewRequest?.active && !batch.reviewRequest?.resolved
                  );
                  const isRecalled = Boolean(
                    batch.status === "Recalled" || batch.recall?.recalled
                  );
                  const isCertified = Boolean(
                    batch.status === "Certified" && !isRecalled
                  );
                  const reportHref = resolveLabReportUrl(
                    batch.quality?.labReportUrl,
                    batch.batchId
                  );

                  return (
                    <tr
                      key={batch._id || batch.batchId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      {/* Batch ID & Origin */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/traceability/${encodeURIComponent(batch.batchId)}`}
                          className="font-mono font-semibold text-honey hover:underline"
                        >
                          {batch.batchId}
                        </Link>
                        <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                          {batch.floralOrigin} •{" "}
                          {typeof batch.apiary === "object"
                            ? batch.apiary?.name
                            : batch.apiaryId || "Apiary"}
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="px-5 py-4 font-semibold">
                        {(batch.quantityGrams / 1000).toFixed(1)} kg
                      </td>

                      {/* Quality Grade & Lab Assay */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              batch.quality?.grade && batch.quality.grade !== "None"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {batch.quality?.grade
                              ? batch.quality.grade.replace("Grade", "Grade ")
                              : "Pending Lab Assay"}
                          </span>

                          {batch.quality?.moisturePercentage !== undefined && (
                            <span className="font-mono text-xs text-black/50 dark:text-white/50">
                              {batch.quality.moisturePercentage}% moisture
                            </span>
                          )}
                        </div>

                        {reportHref && (
                          <a
                            href={reportHref}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                          >
                            <IconFileDescription size={13} />
                            View Assay Certificate
                            <IconExternalLink size={11} />
                          </a>
                        )}
                      </td>

                      {/* Audit Status */}
                      <td className="px-5 py-4">
                        {isRecalled ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              RECALLED
                            </span>
                            {batch.recall?.reason && (
                              <p className="mt-1 max-w-xs text-xs text-red-600/80 dark:text-red-400/80 italic">
                                "{batch.recall.reason}"
                              </p>
                            )}
                          </div>
                        ) : isUnderReview ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Review Request
                            </span>
                            {batch.reviewRequest?.reason && (
                              <p className="mt-1 max-w-xs text-xs text-amber-700/80 dark:text-amber-300/80 font-medium">
                                Reason: {batch.reviewRequest.reason}
                              </p>
                            )}
                          </div>
                        ) : isCertified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <IconShieldCheck size={14} />
                            Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-black/50 dark:bg-white/5 dark:text-white/50">
                            Registered
                          </span>
                        )}
                      </td>

                      {/* Regulatory Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isUnderReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setModalMode("CLEAR");
                                setReasonInput("");
                                setActionError(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <IconCheck size={14} />
                              Pass Audit
                            </button>
                          )}

                          {!isRecalled && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setModalMode("RECALL");
                                setReasonInput("");
                                setActionError(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                            >
                              <IconShieldExclamation size={14} />
                              Recall
                            </button>
                          )}

                          <Link
                            href={`/traceability/${encodeURIComponent(batch.batchId)}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-honey hover:text-honey dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
                          >
                            Trace
                            <IconChevronRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal (Pass Audit / Issue Recall) */}
      {modalMode && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
              <h3 className="text-base font-bold text-ink dark:text-ink-dark">
                {modalMode === "CLEAR"
                  ? "Pass Audit & Clear Review"
                  : "Issue Food Safety Recall"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setSelectedBatch(null);
                }}
                className="rounded-lg p-1 text-black/40 hover:bg-black/5 hover:text-ink dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-black/2 p-3 text-xs dark:bg-white/2">
                <span className="text-black/50 dark:text-white/50">Target Batch:</span>{" "}
                <span className="font-mono font-bold text-honey">
                  {selectedBatch.batchId}
                </span>
                <p className="mt-1 text-black/60 dark:text-white/60">
                  Floral Origin: {selectedBatch.floralOrigin} (
                  {(selectedBatch.quantityGrams / 1000).toFixed(1)} kg)
                </p>
              </div>

              {modalMode === "CLEAR" ? (
                <div>
                  <label className="block text-xs font-semibold text-black/70 dark:text-white/70 mb-1">
                    Regulatory Audit Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Enter compliance verification remarks (e.g. Lab assay certificates inspected and verified compliant with FSSAI standards)..."
                    className="w-full rounded-xl border border-black/10 bg-white/60 p-3 text-xs outline-none transition focus:border-emerald-500 dark:border-white/10 dark:bg-zinc-800"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                    Formal Legal Recall Reason (Required) *
                  </label>
                  <textarea
                    rows={3}
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Enter regulatory violation reason (e.g. High moisture content exceeding 20%, failed C4 sugar adulteration test, microbiological hazard)..."
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs outline-none transition focus:border-red-500 dark:border-red-500/40 dark:bg-zinc-800"
                  />
                </div>
              )}

              {actionError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <IconAlertTriangle size={16} className="shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedBatch(null);
                  }}
                  disabled={actionLoading}
                  className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-black/5 dark:border-white/10 dark:text-ink-dark dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition ${
                    modalMode === "CLEAR"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {actionLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : modalMode === "CLEAR" ? (
                    <IconCheck size={15} />
                  ) : (
                    <IconShieldExclamation size={15} />
                  )}
                  <span>
                    {actionLoading
                      ? "Submitting to Blockchain…"
                      : modalMode === "CLEAR"
                      ? "Confirm Audit Passed"
                      : "Execute Batch Recall"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
