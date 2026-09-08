"use client";

import Link from "next/link";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowUpRight,
  IconChartBar,
  IconHexagon,
  IconTrendingUp,
} from "@tabler/icons-react";

const stats = [
  { label: "Honey Production", value: "—" },
  { label: "Hive Health Score", value: "—" },
  { label: "Active Alerts", value: "—" },
  { label: "Verified Batches", value: "—" },
];

const insights = [
  {
    title: "Hive Health",
    description:
      "AI-based hive health indicators and environmental trends will appear here.",
    icon: IconHexagon,
  },
  {
    title: "Production Trends",
    description:
      "Regional honey production and harvest trends will be available once production data is aggregated.",
    icon: IconTrendingUp,
  },
  {
    title: "Risk Monitoring",
    description:
      "Anomalies and hive risk indicators can be monitored from telemetry and AI predictions.",
    icon: IconAlertTriangle,
  },
];

export default function AuthorityAnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Insights & Monitoring
        </p>

        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Monitor production, hive health, environmental conditions and
          traceability indicators across the Honey Chain network.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* Main chart placeholder */}
      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <IconChartBar size={20} className="text-honey" />
              <h2 className="font-semibold">Network Overview</h2>
            </div>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Aggregated operational trends will be visualized here.
            </p>
          </div>

          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
            Awaiting data
          </span>
        </div>

        <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-black/10 dark:border-white/10">
          <div className="text-center">
            <IconActivity
              size={28}
              stroke={1.5}
              className="mx-auto text-black/25 dark:text-white/25"
            />

            <p className="mt-3 text-sm font-medium">No analytics data yet</p>

            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              Charts will populate when aggregated telemetry and production
              data are available.
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.icon;

          return (
            <div
              key={insight.title}
              className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
                <Icon size={21} stroke={1.7} />
              </div>

              <h3 className="mt-5 font-semibold">{insight.title}</h3>

              <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
                {insight.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Related monitoring */}
      <div className="mt-6 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Monitor hive-level AI signals</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Review hive telemetry and risk indicators from the monitoring
              section.
            </p>
          </div>

          <Link
            href="/authority/hives"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View hives
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}