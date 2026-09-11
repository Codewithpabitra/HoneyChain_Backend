"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowRight,
  IconArrowsTransferDown,
  IconBox,
  IconCheck,
  IconExternalLink,
  IconLoader2,
  IconMapPin,
  IconRefresh,
  IconRoute,
  IconTruck,
  IconX,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import type { BatchItem } from "@/types/batch";

export default function ProcessorShipmentsPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer modal
  const [transferBatch, setTransferBatch] = useState<BatchItem | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferLocation, setTransferLocation] = useState("");
  const [transferRole, setTransferRole] = useState("transporter");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  async function loadShipments() {
    try {
      setLoading(true);
      const res = await batchService.getAll({ limit: 50 });
      setBatches(res.data || []);
    } catch (err) {
      console.error("Failed to load shipments", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShipments();
  }, []);

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferBatch) return;

    setTransferError(null);
    if (!transferTo.trim() || !transferLocation.trim()) {
      setTransferError("Recipient and location are required.");
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
        loadShipments();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Transfer failed.");
      setTransferError(msg);
    } finally {
      setIsTransferring(false);
    }
  }

  const inTransitBatches = batches.filter((b) => b.status === "InTransit");
  const deliveredBatches = batches.filter((b) => b.status === "Delivered");
  const activeShipments = inTransitBatches.length;

  const distributionBatches = batches.filter(
    (b) => b.status === "InTransit" || b.status === "Delivered" || b.status === "Certified"
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Distribution & Logistics
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Shipments & Logistics
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Track verified honey batches as they move through the distribution network and maintain transparent on-chain custody.
          </p>
        </div>

        <button
          type="button"
          onClick={loadShipments}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconTruck size={20} />}
          label="Active Shipments"
          value={loading ? "..." : String(activeShipments)}
        />

        <StatCard
          icon={<IconRoute size={20} />}
          label="In Transit"
          value={loading ? "..." : String(inTransitBatches.length)}
        />

        <StatCard
          icon={<IconBox size={20} />}
          label="Delivered Batches"
          value={loading ? "..." : String(deliveredBatches.length)}
        />
      </div>

      {/* Distribution Batches Table */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading shipments…
        </div>
      ) : distributionBatches.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Distribution & Custody Records</h2>
              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                Active shipments and batches ready for logistics dispatch.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 text-xs uppercase tracking-wider text-black/40 dark:border-white/5 dark:text-white/40">
                <tr>
                  <th className="pb-3 font-medium">Batch ID</th>
                  <th className="pb-3 font-medium">Floral Origin</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Custodian</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {distributionBatches.map((b) => (
                  <tr key={b.batchId} className="transition hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="py-3.5 font-mono font-medium text-black dark:text-white">
                      {b.batchId}
                    </td>
                    <td className="py-3.5 text-black/70 dark:text-white/70">
                      {b.floralOrigin || "Multifloral"}
                    </td>
                    <td className="py-3.5 font-semibold text-black dark:text-white">
                      {(b.quantityKg ?? ((b.quantityGrams || 0) / 1000)).toFixed(1)} kg
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.status === "InTransit"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : b.status === "Delivered"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-xs text-black/50 dark:text-white/50">
                      {b.currentCustodian ? `${b.currentCustodian.slice(0, 10)}…` : "Processor"}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.status !== "Delivered" && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferBatch(b);
                              setTransferTo("");
                              setTransferLocation("");
                              setTransferError(null);
                              setTransferSuccess(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white"
                          >
                            <IconArrowsTransferDown size={14} className="text-honey" />
                            Transfer
                          </button>
                        )}
                        <Link
                          href={`/verify/${encodeURIComponent(b.batchId)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                        >
                          Verify
                          <IconExternalLink size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
            <IconTruck size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No shipments yet
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/50 dark:text-white/50">
            Batches transferred to logistics carriers or marked in transit will appear here.
          </p>
        </section>
      )}

      {/* Transfer Custody Modal */}
      {transferBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#121212]">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold">Transfer Shipment Custody</h3>
                <p className="text-xs text-black/50 dark:text-white/50">
                  Batch: <span className="font-mono font-semibold">{transferBatch.batchId}</span>
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
                <h4 className="mt-4 text-base font-bold">Custody Handover Complete!</h4>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Transaction recorded on blockchain.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Recipient Logistics Carrier / Org *
                  </label>
                  <input
                    type="text"
                    required
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x... or Transporter Org ID"
                    className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm font-mono outline-none focus:border-honey dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Handover Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={transferLocation}
                    onChange={(e) => setTransferLocation(e.target.value)}
                    placeholder="e.g. Processing Dock B, Warehouse #12"
                    className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Carrier Role
                  </label>
                  <select
                    value={transferRole}
                    onChange={(e) => setTransferRole(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm text-black outline-none focus:border-honey dark:border-white/10 dark:bg-paper-dark dark:text-white"
                  >
                    <option value="transporter">Transporter / Fleet</option>
                    <option value="distributor">Distributor / Retail</option>
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
                      "Confirm Transfer"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Shipment workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/0.03">
        <div className="mb-6">
          <h2 className="font-semibold">Distribution Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Maintain custody visibility from the processor to the next participant.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <WorkflowStep
            number="01"
            icon={<IconBox size={20} />}
            title="Prepare"
            description="Select a verified batch that is ready to leave the processing facility."
          />

          <WorkflowStep
            number="02"
            icon={<IconTruck size={20} />}
            title="Dispatch"
            description="Transfer custody and record the destination for the shipment."
          />

          <WorkflowStep
            number="03"
            icon={<IconMapPin size={20} />}
            title="Delivery"
            description="Confirm the batch has reached the next authorized custodian."
          />
        </div>
      </section>
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

function WorkflowStep({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/40 p-5 dark:border-white/10 dark:bg-white/2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-honey">{number}</span>
        <div className="text-honey">{icon}</div>
      </div>

      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">{description}</p>
    </div>
  );
}