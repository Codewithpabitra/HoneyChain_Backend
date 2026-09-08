"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconUsers,
  IconUserSearch,
} from "@tabler/icons-react";

export default function AuthorityFarmersPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Beekeeper Network
          </p>

          <h1 className="text-3xl font-bold tracking-tight">Farmers</h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Monitor registered beekeepers and their apiary operations.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Registered Farmers", value: "—" },
          { label: "Active Farmers", value: "—" },
          { label: "Apiary Clusters", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3"
          >
            <p className="text-sm text-black/50 dark:text-white/50">
              {stat.label}
            </p>

            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/3">
        <IconUserSearch
          size={19}
          className="shrink-0 text-black/30 dark:text-white/30"
        />

        <input
          type="text"
          disabled
          placeholder="Search farmers..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-black/30 disabled:cursor-not-allowed dark:placeholder:text-white/30"
        />
      </div>

      {/* Empty state */}
      <div className="mt-6 rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconUsers size={27} stroke={1.6} />
        </div>

        <h2 className="mt-5 font-semibold">No farmer records available</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Registered beekeeper information will appear here once the backend
          provides the authority farmer listing endpoint.
        </p>
      </div>

      {/* Related module */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Need hive-level monitoring?</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              View hive health and monitoring information from the authority
              section.
            </p>
          </div>

          <Link
            href="/authority/hives"
            className="inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View hives
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}