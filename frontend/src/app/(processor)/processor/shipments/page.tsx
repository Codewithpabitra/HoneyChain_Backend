"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconBox,
  IconMapPin,
  IconRoute,
  IconTruck,
} from "@tabler/icons-react";

export default function ProcessorShipmentsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Distribution
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Shipments
        </h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Track verified honey batches as they move through the distribution
          network.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconTruck size={20} />}
          label="Active Shipments"
          value="—"
        />

        <StatCard
          icon={<IconRoute size={20} />}
          label="In Transit"
          value="—"
        />

        <StatCard
          icon={<IconBox size={20} />}
          label="Delivered"
          value="—"
        />
      </div>

      {/* Shipment workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/0.03">
        <div className="mb-6">
          <h2 className="font-semibold">Distribution Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Maintain custody visibility from the processor to the next
            participant.
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

      {/* Empty state */}
      <section className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconTruck size={28} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No shipments yet
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/50 dark:text-white/50">
          Shipment records will appear here once distribution tracking is
          connected to the backend.
        </p>

        <Link
          href="/processor/batches"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          View batches
          <IconArrowRight size={16} />
        </Link>
      </section>

      {/* Custody note */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconRoute size={20} />
          </div>

          <div>
            <h2 className="font-semibold">
              Blockchain custody tracking
            </h2>

            <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
              Honey Chain can record custody transfers on the blockchain so
              the movement of a batch remains part of its traceability
              history.
            </p>

            <Link
              href="/verify"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
            >
              Verify a batch
              <IconArrowRight size={16} />
            </Link>
          </div>
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