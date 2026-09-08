"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBrain,
  IconHexagon,
  IconPackage,
  IconPlus,
} from "@tabler/icons-react";

import { useAuth } from "@/components/providers/AuthProvider";

export default function FarmerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-black/50 dark:text-white/50">
            Apiary Overview
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Welcome, {user?.name ?? "Farmer"}
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Monitor your hives, harvests and honey traceability.
          </p>
        </div>

        <Link
          href="/farmer/batches/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-medium text-comb transition hover:brightness-95"
        >
          <IconPlus size={18} />
          Register Batch
        </Link>
      </div>

      {/* Overview cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          label="Active Hives"
          value="—"
          icon={IconHexagon}
          href="/farmer/hives"
        />

        <OverviewCard
          label="Healthy Hives"
          value="—"
          icon={IconBrain}
          href="/farmer/hives"
        />

        <OverviewCard
          label="Pending Alerts"
          value="—"
          icon={IconAlertTriangle}
          href="/farmer/alerts"
        />

        <OverviewCard
          label="Honey Harvest"
          value="—"
          icon={IconPackage}
          href="/farmer/harvests"
        />
      </section>

      {/* Monitoring */}
      <section className="grid gap-6 lg:grid-cols-2">
        <DashboardCard
          icon={IconHexagon}
          title="Hive Monitoring"
          description="View sensor readings and AI-powered hive health predictions."
          href="/farmer/hives"
          action="View Hives"
        />

        <DashboardCard
          icon={IconPackage}
          title="Honey Traceability"
          description="Register harvest batches and track their blockchain-backed journey."
          href="/farmer/batches"
          action="View Batches"
        />
      </section>

      {/* AI status */}
      <section className="rounded-2xl border border-black/8 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-honey/15 p-3 text-honey">
            <IconBrain size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">AI Hive Health Monitoring</h2>

            <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
              AI predictions will appear here once telemetry is available
              for your hives. The system can identify health risks,
              anomalies and provide recommendations.
            </p>

            <Link
              href="/farmer/hives"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-honey transition hover:underline"
            >
              Open hive monitoring
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Data availability */}
      <section className="rounded-2xl border border-dashed border-black/15 p-6 dark:border-white/15">
        <div className="flex items-start gap-3">
          <IconAlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-black/50 dark:text-white/50"
          />

          <div>
            <h2 className="font-medium">Waiting for apiary data</h2>

            <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
              Hive and aggregate monitoring statistics will be populated
              when the backend provides the corresponding hive-list and
              aggregation endpoints.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon: typeof IconHexagon;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-black/8 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-black/50 dark:text-white/50">
          {label}
        </span>

        <Icon
          size={19}
          stroke={1.7}
          className="text-black/35 transition group-hover:text-honey dark:text-white/35"
        />
      </div>

      <p className="text-2xl font-semibold">{value}</p>
    </Link>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: typeof IconHexagon;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-black/4 p-3 dark:bg-white/6">
          <Icon size={22} className="text-honey" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>

          <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
            {description}
          </p>

          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-honey transition hover:underline"
          >
            {action}
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}