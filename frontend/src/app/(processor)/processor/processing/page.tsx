"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconActivity,
  IconArrowRight,
  IconBox,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import type { BatchItem } from "@/types/batch";

export default function ProcessorProcessingPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBatches() {
    try {
      setLoading(true);
      const res = await batchService.getAll({ limit: 50 });
      setBatches(res.data || []);
    } catch (err) {
      console.error("Failed to load processing batches", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  const awaiting = batches.filter(
    (b) => b.status === "Registered"
  );
  const processing = batches.filter(
    (b) => b.status === "Certified"
  );
  const completed = batches.filter(
    (b) => b.status === "InTransit" || b.status === "Delivered"
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Production Workflow
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Batch Processing
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Manage the preparation, filtration, and blending stages of verified honey batches.
          </p>
        </div>

        <button
          type="button"
          onClick={loadBatches}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-white/4"
        >
          <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Status overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconClock size={20} />}
          label="Awaiting Processing"
          value={loading ? "..." : String(awaiting.length)}
        />

        <StatCard
          icon={<IconActivity size={20} />}
          label="Certified & Ready"
          value={loading ? "..." : String(processing.length)}
        />

        <StatCard
          icon={<IconCheck size={20} />}
          label="Completed & Dispatched"
          value={loading ? "..." : String(completed.length)}
        />
      </div>

      {/* Batches Table or Empty State */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading processing queue…
        </div>
      ) : batches.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Processing Queue</h2>
              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                Honey batches moving through quality inspection and preparation.
              </p>
            </div>
            <Link
              href="/processor/batches"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-honey hover:underline"
            >
              Batch management
              <IconArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 text-xs uppercase tracking-wider text-black/40 dark:border-white/5 dark:text-white/40">
                <tr>
                  <th className="pb-3 font-medium">Batch ID</th>
                  <th className="pb-3 font-medium">Floral Origin</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Lifecycle Status</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {batches.slice(0, 8).map((b) => (
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
                          b.status === "Certified"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : b.status === "InTransit"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : b.status === "Delivered"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : "bg-honey/10 text-honey"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/verify/${encodeURIComponent(b.batchId)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                      >
                        Trace
                        <IconExternalLink size={12} />
                      </Link>
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
            <IconActivity size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No processing batches yet
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/50 dark:text-white/50">
            Batches assigned to your facility will appear here throughout their processing lifecycle.
          </p>
        </section>
      )}

      {/* Workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="mb-6">
          <h2 className="font-semibold">Processing Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Each processing stage should remain linked to the original honey batch.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ProcessStep
            number="01"
            title="Batch Received"
            description="Verify the incoming batch and its on-chain harvest record."
            icon={<IconBox size={20} />}
          />

          <ProcessStep
            number="02"
            title="Processing & Assay"
            description="Perform sensory testing, moisture check, and lab certification."
            icon={<IconActivity size={20} />}
          />

          <ProcessStep
            number="03"
            title="Packaging & Transfer"
            description="Generate QR verification labels and hand over to distribution."
            icon={<IconCheck size={20} />}
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

function ProcessStep({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
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