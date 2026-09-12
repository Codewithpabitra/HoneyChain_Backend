// src/app/(farmer)/farmer/batches/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IconBox,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconQrcode,
  IconShieldCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import type { BatchItem, BatchStatus } from "@/types/batch";
import { refreshWithFeedback } from "@/lib/refresh";

export default function FarmerBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await batchService.getAll({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setBatches(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      setError("Failed to load batches from backend.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const stats = useMemo(() => {
    const total = batches.length;
    const certified = batches.filter((b) => b.status === "Certified").length;
    const inTransit = batches.filter((b) => b.status === "InTransit").length;
    const delivered = batches.filter((b) => b.status === "Delivered").length;
    return { total, certified, inTransit, delivered };
  }, [batches]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Honey Traceability & Blockchain
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
            My Batches
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Manage harvested honey batches, smart contract registration, and QR verification codes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refreshWithFeedback(fetchBatches)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            href="/farmer/batches/new"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb shadow-xs transition hover:brightness-95"
          >
            <IconPlus size={18} />
            Register Batch
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Total Batches</p>
          <p className="mt-2 text-2xl font-bold">{loading ? "—" : stats.total}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Lab Certified</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "—" : stats.certified}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">In Custody / Transit</p>
          <p className="mt-2 text-2xl font-bold text-honey">
            {loading ? "—" : stats.inTransit}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3">
          <p className="text-sm text-black/50 dark:text-white/50">Delivered</p>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? "—" : stats.delivered}
          </p>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by batch ID or floral origin..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-honey dark:border-white/10 dark:bg-white/3"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-black/10 bg-black/2 p-1 dark:border-white/10 dark:bg-white/3">
          {(
            [
              "ALL",
              "Registered",
              "Certified",
              "InTransit",
              "Delivered",
              "Recalled",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === tab
                  ? "bg-white text-ink shadow-xs dark:bg-white/10 dark:text-ink-dark"
                  : "text-black/50 hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              }`}
            >
              {tab === "ALL" ? "All Batches" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
          Loading batches from blockchain registry…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-alert/20 bg-alert/5 p-6 text-center text-sm text-alert">
          {error}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconBox size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-ink dark:text-ink-dark">
            {search ? "No matching batches found" : "No batches available"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search criteria or filter."
              : "Register a harvested honey batch to begin its blockchain traceability journey."}
          </p>

          {!search && (
            <Link
              href="/farmer/batches/new"
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-honey hover:underline"
            >
              Register your first batch
              <IconChevronRight size={17} />
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/2 dark:text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Batch ID</th>
                  <th className="px-5 py-3.5">Floral Origin</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Quality Grade</th>
                  <th className="px-5 py-3.5">Harvest Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {batches.map((batch) => {
                  const qtyKg = (batch.quantityGrams / 1000).toFixed(1);
                  const harvestDate = batch.harvestTimestamp
                    ? new Date(
                        batch.harvestTimestamp > 10000000000
                          ? batch.harvestTimestamp
                          : batch.harvestTimestamp * 1000
                      ).toLocaleDateString()
                    : "—";

                  return (
                    <tr
                      key={batch._id || batch.batchId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono font-semibold text-ink dark:text-ink-dark">
                          {batch.batchId}
                        </div>
                        {batch.blockchain?.registrationTxHash && (
                          <div className="font-mono text-[10px] text-black/40 dark:text-white/40">
                            Tx: {batch.blockchain.registrationTxHash.slice(0, 10)}…
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-black/75 dark:text-white/75">
                        {batch.floralOrigin}
                        {batch.apiaryLocation?.region && (
                          <div className="text-xs text-black/40 dark:text-white/40">
                            {batch.apiaryLocation.region}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-ink dark:text-ink-dark">
                        {qtyKg} kg
                      </td>
                      <td className="px-5 py-4">
                        <BatchStatusBadge status={batch.status} />
                      </td>
                      <td className="px-5 py-4">
                        {batch.quality?.grade && batch.quality.grade !== "None" ? (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {batch.quality.grade.replace("Grade", "Grade ")}
                          </span>
                        ) : (
                          <span className="text-xs text-black/40 dark:text-white/40">
                            Pending Assay
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-black/50 dark:text-white/50">
                        {harvestDate}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/farmer/batches/${encodeURIComponent(batch.batchId)}/qr`}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
                            title="Generate QR code for honey jar labeling"
                          >
                            <IconQrcode size={14} className="text-honey" />
                            QR
                          </Link>

                          <Link
                            href={`/traceability/${encodeURIComponent(batch.batchId)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-ink-dark"
                            title="Verify on Ethereum Sepolia"
                          >
                            <IconShieldCheck size={14} className="text-emerald-500" />
                            Trace
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/5 p-4 dark:border-white/5">
              <span className="text-xs text-black/50 dark:text-white/50">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchStatusBadge({ status }: { status: BatchStatus }) {
  if (status === "Certified") {
    return (
      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        Certified
      </span>
    );
  }
  if (status === "InTransit") {
    return (
      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
        In Transit
      </span>
    );
  }
  if (status === "Delivered") {
    return (
      <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
        Delivered
      </span>
    );
  }
  if (status === "Recalled") {
    return (
      <span className="rounded-full bg-alert/10 px-2.5 py-0.5 text-xs font-semibold text-alert">
        Recalled
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      Registered
    </span>
  );
}