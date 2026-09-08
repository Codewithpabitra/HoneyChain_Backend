"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconMap,
  IconRoute,
  IconUsers,
} from "@tabler/icons-react";

const stats = [
  { label: "Active Clusters", value: "—" },
  { label: "Farmers Covered", value: "—" },
  { label: "Hives Covered", value: "—" },
];

export default function AuthorityClustersPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Regional Operations
        </p>

        <h1 className="text-3xl font-bold tracking-tight">Clusters</h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Monitor beekeeping clusters, participating farmers and regional
          apiary activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
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

      {/* Cluster area */}
      <div className="mt-8 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconMap size={28} stroke={1.6} />
        </div>

        <h2 className="mt-5 font-semibold">No cluster data available</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Regional cluster information will appear here when cluster
          management and aggregation endpoints are available.
        </p>
      </div>

      {/* Coverage */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconUsers size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Farmer Coverage</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Track beekeeper participation and operational coverage across
            registered clusters.
          </p>

          <Link
            href="/authority/farmers"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View farmers
            <IconArrowUpRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconRoute size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Regional Traceability</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Connect regional production activity with blockchain-backed honey
            traceability records.
          </p>

          <Link
            href="/authority/blockchain"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View blockchain
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}