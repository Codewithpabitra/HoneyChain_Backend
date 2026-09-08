"use client";

import Link from "next/link";
import {
  IconActivity,
  IconArrowUpRight,
  IconHexagon,
  IconSearch,
} from "@tabler/icons-react";

export default function AuthorityHivesPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Hive Monitoring
        </p>

        <h1 className="text-3xl font-bold tracking-tight">Hives</h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Monitor hive health, telemetry and AI-based risk indicators across
          registered apiaries.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Hives", value: "—" },
          { label: "Healthy Hives", value: "—" },
          { label: "At Risk", value: "—" },
          { label: "Offline Devices", value: "—" },
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
        <IconSearch
          size={19}
          className="shrink-0 text-black/30 dark:text-white/30"
        />

        <input
          type="text"
          disabled
          placeholder="Search by hive ID..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-black/30 disabled:cursor-not-allowed dark:placeholder:text-white/30"
        />
      </div>

      {/* Empty state */}
      <div className="mt-6 rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconHexagon size={28} stroke={1.6} />
        </div>

        <h2 className="mt-5 font-semibold">No hive data available</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Hive records will appear here once the backend provides an authority
          hive listing endpoint.
        </p>
      </div>

      {/* Monitoring note */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <IconActivity size={19} className="text-honey" />
              <p className="font-semibold">Telemetry & AI Monitoring</p>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50 dark:text-white/50">
              Hive telemetry can be analysed for environmental anomalies and
              AI-based colony health risk indicators.
            </p>
          </div>

          <Link
            href="/authority/analytics"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View analytics
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}