"use client";

import Link from "next/link";
import {
  IconActivity,
  IconArrowRight,
  IconBox,
  IconCheck,
  IconClock,
  IconInfoCircle,
} from "@tabler/icons-react";

export default function ProcessorProcessingPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Production Workflow
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Processing
        </h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Manage the processing stage of verified honey batches.
        </p>
      </div>

      {/* Status overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconClock size={20} />}
          label="Awaiting Processing"
          value="—"
        />

        <StatCard
          icon={<IconActivity size={20} />}
          label="Currently Processing"
          value="—"
        />

        <StatCard
          icon={<IconCheck size={20} />}
          label="Completed"
          value="—"
        />
      </div>

      {/* Workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="mb-6">
          <h2 className="font-semibold">Processing Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Each processing stage should remain linked to the original honey
            batch.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ProcessStep
            number="01"
            title="Batch Received"
            description="Verify the incoming batch and its traceability record."
            icon={<IconBox size={20} />}
          />

          <ProcessStep
            number="02"
            title="Processing"
            description="Record the processing activity performed on the batch."
            icon={<IconActivity size={20} />}
          />

          <ProcessStep
            number="03"
            title="Ready"
            description="Move the processed honey toward packaging."
            icon={<IconCheck size={20} />}
          />
        </div>
      </section>

      {/* Empty state */}
      <section className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconActivity size={28} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No processing batches yet
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/50 dark:text-white/50">
          Processing records will appear here when batches are assigned to
          the processing workflow.
        </p>

        <Link
          href="/processor/batches"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          View batches
          <IconArrowRight size={16} />
        </Link>
      </section>

      {/* Implementation note */}
      <div className="mt-6 flex gap-3 rounded-2xl border border-black/10 bg-black/2 p-5 dark:border-white/10 dark:bg-white/2">
        <IconInfoCircle
          size={19}
          className="mt-0.5 shrink-0 text-black/40 dark:text-white/40"
        />

        <p className="text-sm leading-6 text-black/50 dark:text-white/50">
          Processing-specific API endpoints are not currently documented in
          the backend API specification, so this screen does not create
          artificial processing records.
        </p>
      </div>
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