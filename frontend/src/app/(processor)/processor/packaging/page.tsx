"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowRight,
  IconBox,
  IconCheck,
  IconExternalLink,
  IconLoader2,
  IconPackage,
  IconQrcode,
  IconRefresh,
} from "@tabler/icons-react";

import { batchService } from "@/services/batch.service";
import type { BatchItem } from "@/types/batch";

export default function ProcessorPackagingPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBatches() {
    try {
      setLoading(true);
      const res = await batchService.getAll({ limit: 50 });
      setBatches(res.data || []);
    } catch (err) {
      console.error("Failed to load batches for packaging", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  const readyBatches = batches.filter((b) => b.status === "Certified");
  const packagedBatches = batches.filter(
    (b) => b.status === "InTransit" || b.status === "Delivered"
  );
  const totalBatches = batches.length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Final Product Preparation
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Packaging & Labeling
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Prepare verified honey batches for consumer packaging, generate tamper-proof QR labels, and verify certifications.
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconBox size={20} />}
          label="Ready for Packaging (Certified)"
          value={loading ? "..." : String(readyBatches.length)}
        />

        <StatCard
          icon={<IconPackage size={20} />}
          label="Packaged & Distributed"
          value={loading ? "..." : String(packagedBatches.length)}
        />

        <StatCard
          icon={<IconQrcode size={20} />}
          label="Total Registered Batches"
          value={loading ? "..." : String(totalBatches)}
        />
      </div>

      {/* Batches Ready for Packaging */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-12 text-sm text-black/50 dark:border-white/10 dark:bg-white/3 dark:text-white/50">
          <IconLoader2 size={20} className="mr-2 animate-spin text-honey" />
          Loading batches ready for packaging…
        </div>
      ) : readyBatches.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Batches Ready for Packaging</h2>
              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                Certified batches eligible for retail jar bottling and QR labeling.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 text-xs uppercase tracking-wider text-black/40 dark:border-white/5 dark:text-white/40">
                <tr>
                  <th className="pb-3 font-medium">Batch ID</th>
                  <th className="pb-3 font-medium">Floral Origin</th>
                  <th className="pb-3 font-medium">Yield</th>
                  <th className="pb-3 font-medium">Assay Grade</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {readyBatches.map((b) => (
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
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {b.quality?.grade || "Grade A"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/farmer/batches/${encodeURIComponent(b.batchId)}/qr`}
                          className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          <IconQrcode size={14} className="text-honey" />
                          Generate QR Label
                        </Link>
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
            <IconPackage size={28} />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            No batches currently awaiting packaging
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/50 dark:text-white/50">
            Batches certified by accredited laboratories will automatically appear here for packaging label creation.
          </p>
        </section>
      )}

      {/* Packaging workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="mb-6">
          <h2 className="font-semibold">Packaging Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Keep the packaged product connected to its original blockchain batch.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <WorkflowStep
            number="01"
            icon={<IconCheck size={20} />}
            title="Verify Batch"
            description="Confirm the batch record and quality certification before packaging."
          />

          <WorkflowStep
            number="02"
            icon={<IconPackage size={20} />}
            title="Package"
            description="Associate the packaged honey with its registered batch."
          />

          <WorkflowStep
            number="03"
            icon={<IconQrcode size={20} />}
            title="Consumer QR"
            description="Provide a QR entry point for public batch verification."
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