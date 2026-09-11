// src/app/(farmer)/farmer/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowRight,
  IconBrain,
  IconHexagon,
  IconPackage,
  IconPlus,
} from "@tabler/icons-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { analyticsService } from "@/services/analytics.service";
import type { DashboardStats } from "@/types/analytics";

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const res = await analyticsService.getDashboardStats();
        if (mounted) {
          setStats(res.data);
        }
      } catch {
        // Handled gracefully with fallback
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

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
          value={loading ? "—" : (stats?.hives?.active ?? 0).toString()}
          icon={IconHexagon}
          href="/farmer/hives"
        />

        <OverviewCard
          label="Healthy Hives"
          value={loading ? "—" : (stats?.hives?.healthy ?? 0).toString()}
          icon={IconBrain}
          href="/farmer/hives"
        />

        <OverviewCard
          label="Pending Alerts"
          value={loading ? "—" : (stats?.alerts?.active ?? 0).toString()}
          icon={IconAlertTriangle}
          href="/farmer/alerts"
        />

        <OverviewCard
          label="Honey Harvest"
          value={
            loading
              ? "—"
              : `${stats?.harvests?.totalQuantityKg ?? 0} kg`
          }
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">AI Hive Health Monitoring</h2>
              {stats?.hives?.averageHealthScore ? (
                <span className="rounded-full bg-honey/10 px-3 py-1 text-xs font-semibold text-honey">
                  Avg Health Score: {stats.hives.averageHealthScore}%
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
              AI predictions process telemetry from your connected IoT sensors to detect health anomalies, swarming risk, and brood temperature conditions.
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

      {/* Operational Highlights */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-medium uppercase tracking-wider text-black/50 dark:text-white/50">
            Telemetry Readings (24h)
          </p>
          <p className="mt-2 text-2xl font-bold">
            {loading ? "—" : (stats?.telemetry?.last24hReadings ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Total historical: {stats?.telemetry?.totalReadings ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-medium uppercase tracking-wider text-black/50 dark:text-white/50">
            Total Batches Produced
          </p>
          <p className="mt-2 text-2xl font-bold">
            {loading ? "—" : (stats?.batches?.total ?? 0).toString()}
          </p>
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Tested & certified: {stats?.batches?.tested ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-black/8 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-medium uppercase tracking-wider text-black/50 dark:text-white/50">
            AI Predictions Evaluated
          </p>
          <p className="mt-2 text-2xl font-bold">
            {loading ? "—" : (stats?.ai?.totalPredictions ?? 0).toString()}
          </p>
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Anomalies flagged: {stats?.ai?.anomaliesDetected ?? 0}
          </p>
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
      <div className="flex items-start justify-between">
        <span className="text-sm text-black/55 dark:text-white/55">
          {label}
        </span>

        <div className="rounded-xl bg-honey/15 p-2 text-honey transition group-hover:scale-105">
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-semibold tracking-tight">
          {value}
        </span>

        <IconArrowRight
          size={16}
          className="text-black/30 transition group-hover:translate-x-0.5 group-hover:text-honey dark:text-white/30"
        />
      </div>
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
      <div className="mb-4 inline-flex rounded-xl bg-honey/15 p-3 text-honey">
        <Icon size={22} />
      </div>

      <h2 className="font-semibold">{title}</h2>

      <p className="mt-1 text-sm leading-6 text-black/50 dark:text-white/50">
        {description}
      </p>

      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-honey transition hover:underline"
      >
        {action}
        <IconArrowRight size={16} />
      </Link>
    </div>
  );
}