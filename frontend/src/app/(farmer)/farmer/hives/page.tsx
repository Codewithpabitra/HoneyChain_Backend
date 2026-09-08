"use client";

import Link from "next/link";
import {
  IconPlus,
  IconHexagon,
  IconChevronRight,
} from "@tabler/icons-react";

export default function HivesPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Apiary Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            My Hives
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Monitor and manage all your connected hives.
          </p>
        </div>

        <Link
          href="/farmer/hives/new"
          className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <IconPlus size={18} />
          Add Hive
        </Link>
      </div>

      {/* Empty State */}
      <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10">
          <IconHexagon size={28} className="text-honey" />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No hives connected yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
          Add your first hive to start monitoring colony health,
          environmental conditions, and AI-powered insights.
        </p>

        <Link
          href="/farmer/hives/new"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          Add your first hive
          <IconChevronRight size={17} />
        </Link>
      </div>
    </div>
  );
}