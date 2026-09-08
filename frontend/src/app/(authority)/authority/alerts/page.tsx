"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconBell,
  IconHexagon,
} from "@tabler/icons-react";

const stats = [
  { label: "Active Alerts", value: "—" },
  { label: "High Risk", value: "—" },
  { label: "Resolved", value: "—" },
];

export default function AuthorityAlertsPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Risk Monitoring
        </p>

        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Monitor hive anomalies, AI risk indicators and operational alerts
          across the Honey Chain network.
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

      {/* Alert area */}
      <div className="mt-8 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconBell size={28} stroke={1.6} />
        </div>

        <h2 className="mt-5 font-semibold">No alerts available</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Alerts will appear here when the backend provides alert aggregation
          and monitoring endpoints.
        </p>
      </div>

      {/* AI monitoring */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconAlertTriangle size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">AI Risk Detection</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            AI predictions can identify potential hive stress conditions,
            anomalies and early warning indicators.
          </p>

          <Link
            href="/authority/hives"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View hives
            <IconArrowUpRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconHexagon size={21} stroke={1.7} />
          </div>

          <h3 className="mt-5 font-semibold">Hive Health Monitoring</h3>

          <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
            Review hive telemetry and health indicators when monitoring data is
            available.
          </p>

          <Link
            href="/authority/analytics"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View analytics
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}