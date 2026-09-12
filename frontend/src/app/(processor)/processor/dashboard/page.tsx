"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconActivity,
  IconArrowRight,
  IconBox,
  IconLoader2,
  IconPackage,
  IconRoute,
  IconShieldCheck,
  IconExternalLink,
} from "@tabler/icons-react";

import { analyticsService } from "@/services/analytics.service";
import { batchService } from "@/services/batch.service";
import type { DashboardStats } from "@/types/analytics";
import type { BatchItem } from "@/types/batch";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { StaggerContainer, StaggerItem, LivePulse } from "@/components/ui/MotionComponents";

export default function ProcessorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBatches, setRecentBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [dashRes, batchRes] = await Promise.allSettled([
          analyticsService.getDashboardStats(),
          batchService.getAll({ limit: 5 }),
        ]);

        if (isMounted) {
          if (dashRes.status === "fulfilled") {
            setStats(dashRes.value.data);
          }
          if (batchRes.status === "fulfilled") {
            setRecentBatches(batchRes.value.data);
          }
        }
      } catch (err) {
        console.error("Failed to load processor dashboard data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalBatches = stats?.batches.total ?? recentBatches.length;
  const inTransit = stats?.batches.inTransit ?? 0;
  const certified = stats?.batches.tested ?? 0;
  const delivered = stats?.batches.delivered ?? recentBatches.filter(b => b.status === "Delivered").length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Honey Processing
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Processing Dashboard
        </h1>

        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Manage honey batches, processing, packaging, and shipments.
        </p>
      </div>

      {/* Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconBox size={20} />}
          label="Total Handled Batches"
          numericValue={totalBatches}
          loading={loading}
          pulseColor="blue"
        />

        <StatCard
          icon={<IconPackage size={20} />}
          label="Certified & Ready"
          numericValue={certified}
          loading={loading}
          pulseColor={certified > 0 ? "emerald" : undefined}
        />

        <StatCard
          icon={<IconRoute size={20} />}
          label="In Transit"
          numericValue={inTransit}
          loading={loading}
        />

        <StatCard
          icon={<IconShieldCheck size={20} />}
          label="Processed & Delivered"
          numericValue={delivered}
          loading={loading}
          pulseColor={delivered > 0 ? "emerald" : undefined}
        />
      </StaggerContainer>

      {/* Workflow */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="mb-6">
          <h2 className="font-semibold">Processing Workflow</h2>

          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Follow each batch through the processing lifecycle.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <WorkflowCard
            number="01"
            title="Harvests"
            description="Receive harvested honey from beekeepers."
            href="/processor/harvests"
          />

          <WorkflowCard
            number="02"
            title="Batches"
            description="Review registered blockchain batches."
            href="/processor/batches"
          />

          <WorkflowCard
            number="03"
            title="Processing"
            description="Record processing and preparation stages."
            href="/processor/processing"
          />

          <WorkflowCard
            number="04"
            title="Packaging"
            description="Prepare verified honey for distribution."
            href="/processor/packaging"
          />
        </div>
      </section>

      {/* Recent Batches or Empty state */}
      {recentBatches.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Recent Batches</h2>
              <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                Latest batches registered in the supply chain ledger.
              </p>
            </div>
            <Link
              href="/processor/batches"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-honey hover:underline"
            >
              View all batches
              <IconArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs uppercase tracking-wider text-black/40 dark:border-white/5 dark:text-white/40">
                  <th className="pb-3 font-medium">Batch ID</th>
                  <th className="pb-3 font-medium">Floral Origin</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Custodian</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {recentBatches.map((b) => (
                  <tr key={b.batchId} className="transition hover:bg-black/2 dark:hover:bg-white/2">
                    <td className="py-3.5 font-mono font-medium text-black dark:text-white">
                      {b.batchId}
                    </td>
                    <td className="py-3.5 text-black/70 dark:text-white/70">
                      {b.floralOrigin || "Multifloral"}
                    </td>
                    <td className="py-3.5 text-black/70 dark:text-white/70">
                      {(b.quantityKg ?? ((b.quantityGrams || 0) / 1000)).toFixed(1)} kg
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.status === "Certified"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : b.status === "InTransit"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : b.status === "Delivered"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : "bg-honey/10 text-honey"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-xs text-black/50 dark:text-white/50">
                      {b.currentCustodian ? `${b.currentCustodian.slice(0, 10)}...` : "Producer"}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/verify/${encodeURIComponent(b.batchId)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-honey hover:underline"
                      >
                        Verify
                        <IconExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-black/3 text-black/40 dark:bg-white/3 dark:text-white/40">
            <IconBox size={23} />
          </div>

          <h2 className="mt-4 font-semibold">
            {loading ? "Loading processing activity..." : "No processing activity yet"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-black/45 dark:text-white/45">
            {loading
              ? "Connecting to the blockchain network..."
              : "Once batches are registered or transferred to your facility, their lifecycle will appear here."}
          </p>
        </section>
      )}

      {/* Shipments */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
                <IconRoute size={20} />
              </div>

              <div>
                <h2 className="font-semibold">Shipment Management</h2>

                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  Track batches moving through the distribution network.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/processor/shipments"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            View shipments
            <IconArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  numericValue = 0,
  loading = false,
  pulseColor,
}: {
  icon: React.ReactNode;
  label: string;
  numericValue?: number;
  loading?: boolean;
  pulseColor?: "emerald" | "amber" | "rose" | "blue";
}) {
  return (
    <StaggerItem>
      <div className="rounded-2xl border border-black/10 bg-white/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey/10 text-honey">
            {icon}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-black/40 dark:text-white/40">{label}</p>
              {pulseColor && <LivePulse color={pulseColor} />}
            </div>
            <p className="text-2xl font-bold">
              {loading ? (
                <span className="inline-block h-7 w-10 animate-pulse rounded bg-black/5 dark:bg-white/10" />
              ) : (
                <AnimatedNumber value={numericValue} />
              )}
            </p>
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}

function WorkflowCard({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-black/10 bg-white/60 p-6 transition hover:border-honey/40 hover:bg-honey/3 dark:border-white/10 dark:bg-white/3 dark:hover:border-honey/40"
    >
      <span className="text-xs font-bold text-honey">{number}</span>
      <h3 className="mt-3 font-semibold group-hover:text-honey">{title}</h3>
      <p className="mt-1 text-xs text-black/45 dark:text-white/45">
        {description}
      </p>
    </Link>
  );
}