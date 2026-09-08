"use client";

import Link from "next/link";
import {
  IconActivity,
  IconArrowRight,
  IconBox,
  IconPackage,
  IconRoute,
} from "@tabler/icons-react";

export default function ProcessorDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Honey Processing
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Processing Dashboard
        </h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Manage honey batches, processing, packaging, and shipments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconBox size={20} />}
          label="Active Batches"
          value="—"
        />

        <StatCard
          icon={<IconActivity size={20} />}
          label="Processing"
          value="—"
        />

        <StatCard
          icon={<IconPackage size={20} />}
          label="Ready for Packaging"
          value="—"
        />

        <StatCard
          icon={<IconRoute size={20} />}
          label="In Transit"
          value="—"
        />
      </div>

      {/* Workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="mb-6">
          <h2 className="font-semibold">Processing Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Follow each batch through the processing lifecycle.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <WorkflowCard
            number="01"
            title="Harvests"
            description="Receive harvested honey from beekeepers."
            href="/processor/harvests"
          />

          <WorkflowCard
            number="02"
            title="Batches"
            description="Review registered blockchain batches."
            href="/processor/batches"
          />

          <WorkflowCard
            number="03"
            title="Processing"
            description="Record processing and preparation stages."
            href="/processor/processing"
          />

          <WorkflowCard
            number="04"
            title="Packaging"
            description="Prepare verified honey for distribution."
            href="/processor/packaging"
          />
        </div>
      </section>

      {/* Shipments */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
                <IconRoute size={20} />
              </div>

              <div>
                <h2 className="font-semibold">Shipment Management</h2>

                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  Track batches moving through the distribution network.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/processor/shipments"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            View shipments
            <IconArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Empty state */}
      <section className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-black/3 text-black/40 dark:bg-white/3 dark:text-white/40">
          <IconBox size={23} />
        </div>

        <h2 className="mt-4 font-semibold">
          No processing activity yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-black/45 dark:text-white/45">
          Once batches are assigned to your processing facility, their
          lifecycle will appear here.
        </p>
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

function WorkflowCard({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-black/10 p-5 transition hover:-translate-y-0.5 hover:border-honey/40 hover:bg-honey/3 dark:border-white/10 dark:hover:border-honey/40 dark:hover:bg-honey/3"
    >
      <span className="font-mono text-xs text-honey">
        {number}
      </span>

      <h3 className="mt-4 font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-black/45 dark:text-white/45">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-1 text-xs font-medium text-honey opacity-0 transition group-hover:opacity-100">
        Open
        <IconArrowRight size={14} />
      </div>
    </Link>
  );
}