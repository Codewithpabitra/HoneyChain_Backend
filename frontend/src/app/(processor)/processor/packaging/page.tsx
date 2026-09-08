"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconBox,
  IconCheck,
  IconPackage,
  IconQrcode,
  IconScan,
} from "@tabler/icons-react";

export default function ProcessorPackagingPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Final Product
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Packaging
        </h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Prepare verified honey batches for packaging and consumer
          traceability.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconBox size={20} />}
          label="Ready for Packaging"
          value="—"
        />

        <StatCard
          icon={<IconPackage size={20} />}
          label="Packaged"
          value="—"
        />

        <StatCard
          icon={<IconQrcode size={20} />}
          label="QR Codes Generated"
          value="—"
        />
      </div>

      {/* Packaging workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="mb-6">
          <h2 className="font-semibold">Packaging Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Keep the packaged product connected to its original blockchain
            batch.
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

      {/* Empty state */}
      <section className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconPackage size={28} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No packaging records yet
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/50 dark:text-white/50">
          Packaging records will appear here once the processing and packaging
          workflow is connected to the backend.
        </p>

        <Link
          href="/processor/batches"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          View batches
          <IconArrowRight size={16} />
        </Link>
      </section>

      {/* QR information */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
              <IconScan size={20} />
            </div>

            <div>
              <h2 className="font-semibold">
                QR-based consumer verification
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-black/50 dark:text-white/50">
                Honey Chain provides a QR code for a registered batch so
                consumers can access its public verification record.
              </p>
            </div>
          </div>

          <Link
            href="/verify"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            Test verification
            <IconArrowRight size={16} />
          </Link>
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
    <div className="rounded-2xl border border-black/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/3">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
          {icon}
        </div>

        <span className="text-2xl font-bold tracking-tight">
          {value}
        </span>
      </div>

      <p className="mt-5 text-sm text-black/50 dark:text-white/50">
        {label}
      </p>
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
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-honey">
          {number}
        </span>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-honey/10 text-honey">
          {icon}
        </div>
      </div>

      <h3 className="mt-5 font-semibold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-black/45 dark:text-white/45">
        {description}
      </p>
    </div>
  );
}