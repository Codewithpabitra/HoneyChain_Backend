"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconBox,
  IconExternalLink,
  IconSearch,
} from "@tabler/icons-react";

export default function ProcessorBatchesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Traceability
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Honey Batches
        </h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Review registered honey batches and their blockchain traceability
          records.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <IconSearch
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30"
          />

          <input
            type="search"
            disabled
            placeholder="Search by batch ID..."
            className="w-full rounded-xl border border-black/10 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-black/30 dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/25"
          />
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-10 text-center dark:border-white/10 dark:bg-white/3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconBox size={28} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No batches available
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Registered honey batches will appear here once the batch listing
          endpoint is available.
        </p>

        <Link
          href="/processor/harvests"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          View incoming harvests
          <IconArrowRight size={16} />
        </Link>
      </div>

      {/* Available functionality */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconExternalLink size={20} />
          </div>

          <div>
            <h2 className="font-semibold">
              Verify an existing batch
            </h2>

            <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
              You can verify a known batch ID through Honey Chain's public
              verification system.
            </p>

            <Link
              href="/verify"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
            >
              Open batch verification
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}