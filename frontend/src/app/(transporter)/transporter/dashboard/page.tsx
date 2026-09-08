"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconBox,
  IconMapPin,
  IconRoute,
  IconTruck,
} from "@tabler/icons-react";

const stats = [
  { label: "Active Shipments", value: "—", icon: IconTruck },
  { label: "In Transit", value: "—", icon: IconRoute },
  { label: "Delivered", value: "—", icon: IconBox },
  { label: "Current Location", value: "—", icon: IconMapPin },
];

export default function TransporterDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-honey">
          Distribution Network
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          Transporter Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-black/50 dark:text-white/50">
          Track honey shipments and maintain transparent custody records during
          distribution.
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

                  <p className="mt-3 text-2xl font-bold">
                    {stat.value}
                  </p>
                </div>

                <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
                  <Icon size={20} stroke={1.8} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipment workflow */}
      <div className="mt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Shipment Workflow</h2>

          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Track the custody journey of registered honey batches.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Receive",
              description:
                "Receive a registered batch from the current supply-chain custodian.",
              icon: IconBox,
            },
            {
              step: "02",
              title: "Transport",
              description:
                "Move the batch while maintaining its custody and location information.",
              icon: IconTruck,
            },
            {
              step: "03",
              title: "Handover",
              description:
                "Transfer custody to the next authorized participant.",
              icon: IconRoute,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.step}
                className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-honey">
                    {item.step}
                  </span>

                  <div className="rounded-xl bg-honey/10 p-2.5 text-honey">
                    <Icon size={20} stroke={1.7} />
                  </div>
                </div>

                <h3 className="mt-5 font-semibold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current shipments */}
      <div className="mt-8 rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
          <IconTruck size={28} stroke={1.6} />
        </div>

        <h2 className="mt-5 font-semibold">No shipments available</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
          Shipment records will appear here once the backend provides
          distribution and shipment management endpoints.
        </p>
      </div>

      {/* Traceability */}
      <div className="mt-6 rounded-2xl border border-honey/20 bg-honey/6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Blockchain-backed custody</p>

            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
              Registered batch transfers can be verified through the public
              traceability record.
            </p>
          </div>

          <Link
            href="/verify"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-honey hover:underline"
          >
            Verify a batch
            <IconArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}