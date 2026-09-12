"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowRight,
  IconArrowsTransferDown,
  IconBox,
  IconCheck,
  IconChevronRight,
  IconExternalLink,
  IconLoader2,
  IconQrcode,
  IconSearch,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import type { BatchItem, BatchStatus } from "@/types/batch";

export default function ProcessorBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Transfer modal state
  const [transferBatch, setTransferBatch] = useState<BatchItem | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferLocation, setTransferLocation] = useState("");
  const [transferRole, setTransferRole] = useState("distributor");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // QR modal state
  const [selectedQrBatch, setSelectedQrBatch] = useState<BatchItem | null>(null);
  const [qrResult, setQrResult] = useState<{
    verificationUrl: string;
    dataUrl: string;
    svg: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  async function handleOpenQrModal(batch: BatchItem) {
    setSelectedQrBatch(batch);
    setQrResult(null);
    setQrError(null);
    setQrLoading(true);
    try {
      const res = await batchService.generateQR(batch.batchId);
      setQrResult(res);
    } catch (err) {
      setQrError(
        err instanceof Error ? err.message : "Failed to generate QR code"
      );
    } finally {
      setQrLoading(false);
    }
  }

  async function loadBatches() {
    try {
      setLoading(true);
      setError(null);

      const params: Parameters<typeof batchService.getAll>[0] = {
        page,
        limit: 10,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };

      const res = await batchService.getAll(params);
      setBatches(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load honey batches."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, [page, statusFilter, search]);

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferBatch) return;

    setTransferError(null);

    if (!transferTo.trim()) {
      setTransferError("Recipient address or organization is required.");
      return;
    }

    if (!transferLocation.trim()) {
      setTransferError("Handover location is required.");
      return;
    }

    try {
      setIsTransferring(true);
      await batchService.transfer(transferBatch.batchId, {
        to: transferTo.trim(),
        location: transferLocation.trim(),
        role: transferRole,
      });

      setTransferSuccess(true);
      setTimeout(() => {
        setTransferBatch(null);
        setTransferSuccess(false);
        setTransferTo("");
        setTransferLocation("");
        loadBatches();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Transfer failed. Please verify credentials.");
      setTransferError(msg);
    } finally {
      setIsTransferring(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Traceability & Chain of Custody
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Honey Batches
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Review registered honey batches, trace on-chain provenance, and transfer custody.
          </p>
        </div>

        <Link
          href="/verify"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/3 dark:hover:bg-white/5"
        >
          Verify batch
          <IconExternalLink size={16} />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <IconSearch
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by batch ID or floral origin..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-black/30 focus:border-honey dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-black/3 p-1 dark:border-white/10 dark:bg-white/3">
          {(
            [
              "ALL",
              "Registered",
              "Certified",
              "InTransit",
              "Delivered",
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
                  ? "bg-white text-black shadow-xs dark:bg-white/10 dark:text-white"
                  : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {tab === "ALL" ? "All Batches" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading batches from blockchain registry…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-500">
          {error}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/40 p-12 text-center dark:border-white/10 dark:bg-white/2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconBox size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-black dark:text-white">
            {search ? "No matching batches found" : "No batches available"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
            {search
              ? "Try adjusting your search query or status filter."
              : "Registered honey batches will appear here as soon as they are submitted by beekeepers."}
          </p>
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
                  <th className="px-5 py-3.5">Quality</th>
                  <th className="px-5 py-3.5">Current Custodian</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {batches.map((batch) => {
                  const qtyKg = (batch.quantityGrams / 1000).toFixed(1);

                  return (
                    <tr
                      key={batch._id || batch.batchId}
                      className="transition hover:bg-black/1 dark:hover:bg-white/1"
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono font-semibold text-black dark:text-white">
                          {batch.batchId}
                        </div>
                        {batch.blockchain?.registrationTxHash && (
                          <div className="font-mono text-[10px] text-black/40 dark:text-white/40">
                            Tx: {batch.blockchain.registrationTxHash.slice(0, 10)}…
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-black/75 dark:text-white/75">
                        {batch.floralOrigin || "Multifloral"}
                        {batch.apiaryLocation?.region && (
                          <div className="text-xs text-black/40 dark:text-white/40">
                            {batch.apiaryLocation.region}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-black dark:text-white">
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
                      <td className="px-5 py-4 font-mono text-xs text-black/55 dark:text-white/55">
                        {batch.currentCustodian ? (
                          <span title={batch.currentCustodian}>
                            {batch.currentCustodian.slice(0, 12)}…
                          </span>
                        ) : (
                          "Producer"
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferBatch(batch);
                              setTransferTo("");
                              setTransferLocation("");
                              setTransferError(null);
                              setTransferSuccess(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            title="Transfer Custody"
                          >
                            <IconArrowsTransferDown size={14} className="text-honey" />
                            Transfer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenQrModal(batch)}
                            className="inline-flex items-center gap-1 rounded-lg border border-honey/30 bg-honey/10 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-honey/20 dark:bg-honey/20 dark:text-amber-300"
                            title="Generate / View QR Label"
                          >
                            <IconQrcode size={14} className="text-honey" />
                            QR
                          </button>

                          <Link
                            href={`/verify/${encodeURIComponent(batch.batchId)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            title="Verify on Blockchain"
                          >
                            <IconShieldCheck size={14} className="text-emerald-500" />
                            Verify
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

      {/* Transfer Custody Modal */}
      {transferBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#121212]">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold">Transfer Batch Custody</h3>
                <p className="text-xs text-black/50 dark:text-white/50">
                  Batch: <span className="font-mono font-semibold">{transferBatch.batchId}</span> ({transferBatch.floralOrigin})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferBatch(null)}
                className="rounded-xl p-2 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/5"
              >
                <IconX size={20} />
              </button>
            </div>

            {transferSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <IconCheck size={28} />
                </div>
                <h4 className="mt-4 text-base font-bold">Custody Transferred!</h4>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Transaction recorded on ledger. Updating registry…
                </p>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Recipient Address / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x... or Distributor Org ID"
                    className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm font-mono outline-none focus:border-honey dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Transfer / Handover Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={transferLocation}
                    onChange={(e) => setTransferLocation(e.target.value)}
                    placeholder="e.g. Central Warehouse Dock #4, Berlin"
                    className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Recipient Role
                  </label>
                  <select
                    value={transferRole}
                    onChange={(e) => setTransferRole(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm text-black outline-none focus:border-honey dark:border-white/10 dark:bg-paper-dark dark:text-white"
                  >
                    <option value="distributor">Distributor / Logistics</option>
                    <option value="processor">Processor / Facility</option>
                  </select>
                </div>

                {transferError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-500">
                    {transferError}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTransferBatch(null)}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTransferring}
                    className="inline-flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isTransferring ? (
                      <>
                        <IconLoader2 size={16} className="animate-spin" />
                        Transferring…
                      </>
                    ) : (
                      <>
                        <IconArrowsTransferDown size={16} />
                        Confirm Transfer
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QR Label Modal */}
      {selectedQrBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#121212]">
            <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
              <div>
                <p className="text-xs font-semibold tracking-wider text-honey uppercase">
                  Tamper-Proof Consumer QR
                </p>
                <h3 className="font-mono text-base font-bold text-black dark:text-white">
                  {selectedQrBatch.batchId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrBatch(null)}
                className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            {qrLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <IconLoader2 size={32} className="animate-spin text-honey" />
                <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                  Generating official QR label…
                </p>
              </div>
            ) : qrError ? (
              <div className="py-6 text-center text-sm text-red-600">
                {qrError}
              </div>
            ) : qrResult ? (
              <div className="py-4 text-center">
                <div className="mx-auto my-3 flex w-fit items-center justify-center rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrResult.dataUrl}
                    alt={`QR Code for ${selectedQrBatch.batchId}`}
                    className="h-48 w-48 object-contain"
                  />
                </div>

                <div className="mt-4 rounded-xl border border-black/5 bg-black/2 p-3 text-left text-xs dark:border-white/5 dark:bg-white/2">
                  <div className="flex justify-between py-1">
                    <span className="text-black/50 dark:text-white/50">Status:</span>
                    <span className="font-semibold text-emerald-600">{selectedQrBatch.status}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black/50 dark:text-white/50">Floral Origin:</span>
                    <span className="font-medium text-black dark:text-white">{selectedQrBatch.floralOrigin || "Multifloral"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black/50 dark:text-white/50">Grade:</span>
                    <span className="font-medium text-black dark:text-white">{selectedQrBatch.quality?.grade || "Grade A"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black/50 dark:text-white/50">Verification Link:</span>
                    <a
                      href={qrResult.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate max-w-[180px] font-mono text-honey hover:underline"
                    >
                      {qrResult.verificationUrl}
                    </a>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <a
                    href={qrResult.dataUrl}
                    download={`${selectedQrBatch.batchId}-label.png`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-honey py-2.5 text-xs font-semibold text-black transition hover:opacity-90"
                  >
                    <IconQrcode size={16} />
                    Download PNG
                  </a>
                  <a
                    href={`/verify/${encodeURIComponent(selectedQrBatch.batchId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 px-4 py-2.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                  >
                    Verify
                    <IconExternalLink size={14} />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
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
      <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-500">
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