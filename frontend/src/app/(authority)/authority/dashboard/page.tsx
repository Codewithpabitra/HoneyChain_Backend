"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconChartBar,
  IconHexagon,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";

const stats = [
  {
    label: "Registered Farmers",
    value: "—",
    icon: IconUsers,
  },
  {
    label: "Active Hives",
    value: "—",
    icon: IconHexagon,
  },
  {
    label: "Verified Batches",
    value: "—",
    icon: IconShieldCheck,
  },
  {
    label: "Active Alerts",
    value: "—",
    icon: IconAlertTriangle,
  },
];

const modules = [
  {
    title: "Farmers",
    description: "Monitor registered beekeepers and their apiary operations.",
    href: "/authority/farmers",
    icon: IconUsers,
  },
  {
    title: "Hive Monitoring",
    description: "View hive health, telemetry and AI-based risk indicators.",
    href: "/authority/hives",
    icon: IconHexagon,
  },
  {
    title: "Clusters",
    description: "Monitor beekeeping clusters and regional activity.",
    href: "/authority/clusters",
    icon: IconChartBar,
  },
  {
    title: "Blockchain",
    description: "Inspect traceability records and on-chain activity.",
    href: "/authority/blockchain",
    icon: IconShieldCheck,
  },
];

export default function AuthorityDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Administration & Monitoring
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Authority Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Monitor beekeeping operations, honey traceability, hive health and
          blockchain-backed records across registered clusters.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-black/50 dark:text-white/50">
                    {stat.label}
                  </p>

                  <p className="mt-3 text-2xl font-bold">{stat.value}</p>
                </div>

                <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
                  <Icon size={20} stroke={1.8} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modules */}
      <div className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Monitoring Modules</h2>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Access operational and traceability information.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.title}
                href={module.href}
                className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-honey/40 hover:shadow-lg hover:shadow-black/5 dark:border-white/10 dark:bg-white/3 dark:hover:border-honey/40 dark:hover:shadow-black/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-honey/10 p-3 text-honey">
                    <Icon size={22} stroke={1.8} />
                  </div>

                  <IconArrowUpRight
                    size={19}
                    className="text-black/30 transition group-hover:text-honey dark:text-white/30 dark:group-hover:text-honey"
                  />
                </div>

                <h3 className="mt-5 font-semibold">{module.title}</h3>

                <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Blockchain status */}
      <div className="mt-8 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <IconShieldCheck size={19} className="text-honey" />
              <h2 className="font-semibold">Traceability Network</h2>
            </div>

            <p className="mt-2 text-sm text-black/50 dark:text-white/50">
              Blockchain verification status and registered honey records.
            </p>
          </div>

          <Link
            href="/authority/blockchain"
            className="inline-flex items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            View blockchain
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {/* Empty state */}
      <div className="mt-8 rounded-2xl border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/15">
        <IconChartBar
          size={30}
          stroke={1.5}
          className="mx-auto text-black/30 dark:text-white/30"
        />

        <h2 className="mt-4 font-semibold">No monitoring data yet</h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-black/50 dark:text-white/50">
          Authority-level statistics will appear here once farmers, hives and
          traceability records are available through the backend.
        </p>
      </div>
    </div>
  );
}