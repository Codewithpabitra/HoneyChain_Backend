// src/app/(farmer)/farmer/dashboard/page.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";

// Temporary — replace once the real dashboard is built. This exists so
// the post-login redirect has somewhere to land instead of 404ing.
export default function FarmerDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-medium text-ink dark:text-ink-dark">
        Signed in
      </h1>

      <dl className="mt-6 space-y-3 text-sm">
        <Row label="Name" value={user?.name} />
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={user?.role} />
        <Row label="Wallet" value={user?.walletAddress} />
        <Row label="Organization" value={user?.organization?.name} />
      </dl>

      <button
        onClick={() => logout()}
        className="mt-8 rounded-md border border-ink/15 px-4 py-2 text-sm text-ink hover:bg-ink/5 dark:border-ink-dark/20 dark:text-ink-dark dark:hover:bg-ink-dark/5"
      >
        Sign out
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-ink/10 pb-2 dark:border-ink-dark/10">
      <dt className="text-ink/50 dark:text-ink-dark/50">{label}</dt>
      <dd className="text-ink dark:text-ink-dark">{value ?? "—"}</dd>
    </div>
  );
}