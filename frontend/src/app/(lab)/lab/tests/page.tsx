"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconClipboardCheck,
  IconFlask,
  IconPlus,
} from "@tabler/icons-react";

export default function LabTestsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Quality Assurance
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Quality Tests
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Certify honey batches and record laboratory quality results.
          </p>
        </div>

        <Link
          href="/lab/tests/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
        >
          <IconPlus size={18} />
          New Quality Test
        </Link>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconClipboardCheck size={20} />}
          label="Tests Completed"
          value="—"
        />

        <StatCard
          icon={<IconFlask size={20} />}
          label="Pending Tests"
          value="—"
        />

        <StatCard
          icon={<IconClipboardCheck size={20} />}
          label="Certified Batches"
          value="—"
        />
      </div>

      {/* Empty state */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-10 text-center dark:border-white/10 dark:bg-white/3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconFlask size={28} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No quality tests yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Start a quality test by entering a registered honey batch and
          recording its laboratory certification details.
        </p>

        <Link
          href="/lab/tests/new"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          Create your first test
          <IconArrowRight size={16} />
        </Link>
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