// src/app/(distributor)/distributor/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowUpRight,
  IconBox,
  IconCheck,
  IconLoader2,
  IconMapPin,
  IconRoute,
  IconShieldCheck,
  IconTruck,
  IconX,
} from "@tabler/icons-react";

import { analyticsService } from "@/services/analytics.service";
import { batchService } from "@/services/batch.service";
import type { DashboardStats } from "@/types/analytics";
import type { BatchItem } from "@/types/batch";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { StaggerContainer, StaggerItem, LivePulse } from "@/components/ui/MotionComponents";
import { clearApiCache } from "@/lib/apiCache";

export default function DistributorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Deliver modal state
  const [deliverBatch, setDeliverBatch] = useState<BatchItem | null>(null);
  const [deliverLocation, setDeliverLocation] = useState("");
  const [deliverTo, setDeliverTo] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const [deliverSuccess, setDeliverSuccess] = useState(false);

  async function loadData(bypassCache = false) {
    try {
      setLoading(true);
      if (bypassCache) {
        clearApiCache();
      }
      const [dashRes, batchRes] = await Promise.allSettled([
        analyticsService.getDashboardStats(),
        batchService.getAll({ limit: 50 }),
      ]);

      if (dashRes.status === "fulfilled") {
        setStats(dashRes.value.data);
      }
      if (batchRes.status === "fulfilled") {
        setBatches(batchRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load distributor data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeliverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deliverBatch) return;

    setDeliverError(null);
    if (!deliverLocation.trim()) {
      setDeliverError("Delivery location is required.");
      return;
    }

    try {
      setDelivering(true);
      await batchService.deliver(deliverBatch.batchId, {
        location: deliverLocation.trim(),
        to: deliverTo.trim() || undefined,
        role: "distributor",
      });

      setDeliverSuccess(true);
      setTimeout(() => {
        setDeliverBatch(null);
        setDeliverSuccess(false);
        setDeliverLocation("");
        setDeliverTo("");
        loadData(true);
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to record delivery.");
      setDeliverError(msg);
    } finally {
      setDelivering(false);
    }
  }

  const inTransitCount =
    stats?.batches.inTransit ?? batches.filter((b) => b.status === "InTransit").length;
  const deliveredCount =
    stats?.batches.delivered ?? batches.filter((b) => b.status === "Delivered").length;
  const totalWeightKg = stats?.batches.totalQuantityKg
    ? stats.batches.totalQuantityKg
    : Number((batches.reduce((sum, b) => sum + (b.quantityGrams || 0), 0) / 1000).toFixed(0));

  const statItems = [
    {
      label: "Active Shipments",
      numericValue: inTransitCount,
      icon: IconTruck,
      pulse: inTransitCount > 0 ? ("amber" as const) : undefined,
    },
    {
      label: "In Transit",
      numericValue: inTransitCount,
      icon: IconRoute,
    },
    {
      label: "Delivered",
      numericValue: deliveredCount,
      icon: IconBox,
      pulse: "emerald" as const,
    },
    {
      label: "Network Volume",
      numericValue: totalWeightKg,
      suffix: " kg",
      icon: IconMapPin,
    },
  ];

  const transitBatches = batches.filter(
    (b) => b.status === "InTransit" || b.status === "Certified" || b.status === "Registered"
  );

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Distribution Network
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Distributor Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Track honey shipments, record custody handovers, and verify deliveries on the blockchain.
        </p>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statItems.map((stat) => {
          const Icon = stat.icon;

          return (
            <StaggerItem key={stat.label}>
              <div className="rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-black/50 dark:text-white/50">
                        {stat.label}
                      </p>
                      {stat.pulse && <LivePulse color={stat.pulse} />}
                    </div>

                    <p className="mt-3 text-2xl font-bold">
                      {loading ? (
                        <span className="inline-block h-7 w-12 animate-pulse rounded bg-black/5 dark:bg-white/10" />
                      ) : (
                        <AnimatedNumber
                          value={stat.numericValue}
                          suffix={stat.suffix || ""}
                        />
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
                    <Icon size={20} stroke={1.8} />
                  </div>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Shipment workflow */}
      <div className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Shipment Workflow</h2>

          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Track the custody journey of registered honey batches.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Receive",
              description:
                "Receive a registered or certified batch from the processor or apiary custodian.",
              icon: IconBox,
            },
            {
              step: "02",
              title: "Transport",
              description:
                "Move the batch under monitored conditions while maintaining on-chain custody.",
              icon: IconTruck,
            },
            {
              step: "03",
              title: "Handover & Deliver",
              description:
                "Mark delivery and transfer custody to the retailer, warehouse, or final destination.",
              icon: IconRoute,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.step}
                className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-honey">
                    {item.step}
                  </span>

                  <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
                    <Icon size={20} stroke={1.7} />
                  </div>
                </div>

                <h3 className="mt-5 font-semibold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batches in Transit / Distribution Section */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Batches in Distribution</h2>
            <p className="text-sm text-black/50 dark:text-white/50">
              Batches eligible for transport handover and final destination delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading}
            className="text-xs font-semibold text-honey hover:underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
            <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
            Loading distribution batches…
          </div>
        ) : transitBatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
              <IconTruck size={28} stroke={1.6} />
            </div>

            <h2 className="mt-5 font-semibold">No active shipments in transit</h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
              When batches are transferred to your logistics fleet or marked in transit, they will appear here.
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
                    <th className="px-5 py-3.5">Current Status</th>
                    <th className="px-5 py-3.5">Current Custodian</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {transitBatches.map((batch) => {
                    const qtyKg = (batch.quantityGrams / 1000).toFixed(1);

                    return (
                      <tr
                        key={batch._id || batch.batchId}
                        className="transition hover:bg-black/1 dark:hover:bg-white/1"
                      >
                        <td className="px-5 py-4 font-mono font-medium text-black dark:text-white">
                          {batch.batchId}
                        </td>
                        <td className="px-5 py-4 text-black/75 dark:text-white/75">
                          {batch.floralOrigin || "Multifloral"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-black dark:text-white">
                          {qtyKg} kg
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              batch.status === "InTransit"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : batch.status === "Delivered"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : batch.status === "Certified"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-honey/10 text-honey"
                            }`}
                          >
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-black/50 dark:text-white/50">
                          {batch.currentCustodian ? `${batch.currentCustodian.slice(0, 10)}…` : "Producer"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {batch.status !== "Delivered" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliverBatch(batch);
                                  setDeliverLocation("");
                                  setDeliverTo("");
                                  setDeliverError(null);
                                  setDeliverSuccess(false);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-honey px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90"
                              >
                                <IconCheck size={14} />
                                Mark Delivered
                              </button>
                            )}

                            <Link
                              href={`/verify/${encodeURIComponent(batch.batchId)}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white"
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
          </div>
        )}
      </div>

      {/* Mark Delivered Modal */}
      {deliverBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#121212]">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold">Record Final Delivery</h3>
                <p className="text-xs text-black/50 dark:text-white/50">
                  Batch: <span className="font-mono font-semibold">{deliverBatch.batchId}</span> ({deliverBatch.floralOrigin})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeliverBatch(null)}
                className="rounded-xl p-2 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/5"
              >
                <IconX size={20} />
              </button>
            </div>

            {deliverSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <IconCheck size={28} />
                </div>
                <h4 className="mt-4 text-base font-bold">Delivery Recorded!</h4>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Batch marked as Delivered on the blockchain ledger.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDeliverSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Delivery Destination / Facility *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliverLocation}
                    onChange={(e) => setDeliverLocation(e.target.value)}
                    placeholder="e.g. Retail Distribution Hub, Hamburg"
                    className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                    Recipient Entity / Agent
                    <span className="ml-1 text-[11px] font-normal text-black/40 dark:text-white/40">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={deliverTo}
                    onChange={(e) => setDeliverTo(e.target.value)}
                    placeholder="0x... or Store Manager Name"
                    className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-honey dark:border-white/10"
                  />
                </div>

                {deliverError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-500">
                    {deliverError}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeliverBatch(null)}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={delivering}
                    className="inline-flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                  >
                    {delivering ? (
                      <>
                        <IconLoader2 size={16} className="animate-spin" />
                        Recording…
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} />
                        Confirm Delivery
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Traceability */}
      <div className="mt-6 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Blockchain-backed custody</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Registered batch transfers can be verified through the public traceability record.
            </p>
          </div>

          <Link
            href="/verify"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            Verify a batch
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
