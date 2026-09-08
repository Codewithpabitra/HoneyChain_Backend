"use client";

import Link from "next/link";
import {
  IconBox,
  IconChevronRight,
  IconPlus,
} from "@tabler/icons-react";

export default function FarmerBatchesPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Honey Traceability
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            My Batches
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Manage harvested honey batches and their blockchain records.
          </p>
        </div>

        <Link
          href="/farmer/batches/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-comb transition hover:bg-honey-light"
        >
          <IconPlus size={18} />
          Register Batch
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-black/15 bg-white/40 p-10 text-center dark:border-white/10 dark:bg-white/2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconBox size={27} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No batches available
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
          Register a harvested honey batch to begin its traceability
          journey.
        </p>

        <Link
          href="/farmer/batches/new"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-honey hover:underline"
        >
          Register your first batch
          <IconChevronRight size={17} />
        </Link>
      </div>
    </div>
  );
}