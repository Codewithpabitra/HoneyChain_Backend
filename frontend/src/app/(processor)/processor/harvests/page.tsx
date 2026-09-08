"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconBox,
  IconPackage,
  IconSearch,
} from "@tabler/icons-react";

export default function ProcessorHarvestsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Incoming Honey
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Harvests
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Review harvested honey received from registered beekeepers.
          </p>
        </div>
      </div>

      {/* Search / filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30"
          />

          <input
            type="search"
            placeholder="Search harvests..."
            disabled
            className="w-full rounded-xl border border-black/10 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-black/30 dark:border-white/10 dark:bg-white/3 dark:placeholder:text-white/25"
          />
        </div>

        <button
          type="button"
          disabled
          className="rounded-xl border border-black/10 px-4 py-3 text-sm font-medium text-black/40 dark:border-white/10 dark:text-white/40"
        >
          All harvests
        </button>
      </div>

      {/* Empty state */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-10 text-center dark:border-white/10 dark:bg-white/3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconPackage size={28} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No harvests available
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Harvest records received from beekeepers will appear here when the
          harvest management API is connected.
        </p>

        <Link
          href="/processor/batches"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-honey hover:underline"
        >
          View registered batches
          <IconArrowRight size={16} />
        </Link>
      </div>

      {/* Information */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InfoCard
          icon={<IconPackage size={20} />}
          title="Incoming Harvest"
          description="Harvest information will provide the source, quantity, floral origin, and apiary location of honey entering the processing workflow."
        />

        <InfoCard
          icon={<IconBox size={20} />}
          title="Blockchain Batches"
          description="Once a harvest is registered as a batch, its traceability record can be verified through the Honey Chain blockchain."
        />
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
        {icon}
      </div>

      <h2 className="mt-5 font-semibold">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
        {description}
      </p>
    </div>
  );
}