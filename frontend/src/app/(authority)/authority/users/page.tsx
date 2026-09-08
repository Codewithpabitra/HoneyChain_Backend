"use client";

import {
  IconPlus,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";

export default function AuthorityUsersPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-honey">
            Access Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Users
          </h1>

          <p className="mt-2 text-sm text-black/50 dark:text-white/50">
            Manage Honey Chain users, roles and organization access.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <IconPlus size={18} />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: "—" },
          { label: "Beekeepers", value: "—" },
          { label: "Processors", value: "—" },
          { label: "Labs", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/3"
          >
            <p className="text-sm text-black/50 dark:text-white/50">
              {stat.label}
            </p>

            <p className="mt-3 text-2xl font-bold">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/3">
        <div className="border-b border-black/10 px-6 py-5 dark:border-white/10">
          <h2 className="font-semibold">Registered Users</h2>

          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            User accounts and assigned platform roles.
          </p>
        </div>

        <div className="flex min-h-64 items-center justify-center px-6 py-12">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey/10 text-honey">
              <IconUsers size={28} stroke={1.6} />
            </div>

            <h3 className="mt-5 font-semibold">
              No users available
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50 dark:text-white/50">
              User records will appear here once they are available from the
              backend.
            </p>
          </div>
        </div>
      </div>

      {/* Role information */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/10 text-honey">
            <IconShieldCheck size={21} stroke={1.7} />
          </div>

          <div>
            <h2 className="font-semibold">Role-based access</h2>

            <p className="mt-2 text-sm leading-6 text-black/50 dark:text-white/50">
              Honey Chain supports role-based access for administrators,
              beekeepers, processors, laboratory analysts, transporters and
              auditors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}