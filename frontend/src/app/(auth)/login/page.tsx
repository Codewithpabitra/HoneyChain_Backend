// src/app/(auth)/login/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

import Link from "next/link";
import { IconArrowLeft, IconBuildingCommunity } from "@tabler/icons-react";
import { BeeIcon } from "@/components/ui/BeeIcon";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(ROLE_DASHBOARD_PATH[user.role]);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        "Couldn't sign you in. Check your email and password.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-comb px-16 py-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <HexPattern />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-honey/15 text-honey-light ring-1 ring-honey/30">
            <BeeIcon size={20} />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-honey-light">
            HoneyChain
          </span>
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-3xl leading-snug text-paper/95">
            Every jar carries the record of where it came from — the hive, the
            harvest, the hands it passed through.
          </p>
          <p className="mt-6 text-sm text-paper/60">
            Sign in with the credentials your organization issued you. New
            accounts are created by an administrator, not self-serve.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12 dark:bg-paper-dark">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-honey/10 text-honey ring-1 ring-honey/25">
              <BeeIcon size={20} />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight text-honey">
              HoneyChain
            </span>
          </div>

          <h1 className="text-2xl font-medium text-ink dark:text-ink-dark">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-ink/60 dark:text-ink-dark/60">
            Beekeeper, processor, lab, distributor, auditor, or administrator account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm text-ink/80 dark:text-ink-dark/80"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@honeychain.org"
                className="w-full rounded-md border border-ink/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-ink-dark/20 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm text-ink/80 dark:text-ink-dark/80"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-ink/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-ink-dark/20 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-alert/10 px-3.5 py-2.5 text-sm text-alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-md bg-honey px-4 py-2.5 text-sm font-medium text-comb transition-colors",
                "hover:bg-honey-light cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>

            <div className="mt-6 flex flex-col gap-3">
              <div className="space-y-2">
                <Link
                  href="/register"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/3 text-sm font-medium text-ink transition hover:bg-black/6 dark:border-white/10 dark:bg-white/4 dark:text-ink-dark dark:hover:bg-white/8"
                >
                  <IconBuildingCommunity size={17} stroke={1.8} />
                  Register your organization
                </Link>
                <p className="text-center text-xs text-ink/60 dark:text-ink-dark/60">
                  Is your organization not yet part of HoneyChain? Submit an application for approval.
                </p>
              </div>

              <Link
                href="/"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-black/50 transition hover:text-ink dark:text-white/50 dark:hover:text-ink-dark"
              >
                <IconArrowLeft size={17} stroke={1.8} />
                Back to Home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// A quiet, subject-appropriate honeycomb motif for the brand panel —
// decorative only, so it's inert to assistive tech.
function HexPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-24 -top-16 h-105 w-105 text-paper/6"
      viewBox="0 0 200 200"
      fill="none"
    >
      {Array.from({ length: 5 }).flatMap((_, row) =>
        Array.from({ length: 5 }).map((__, col) => {
          const x = col * 34 + (row % 2 === 0 ? 0 : 17);
          const y = row * 30;
          return (
            <polygon
              key={`${row}-${col}`}
              points="10,0 20,5.8 20,17.3 10,23.1 0,17.3 0,5.8"
              transform={`translate(${x}, ${y})`}
              stroke="currentColor"
              strokeWidth="1"
            />
          );
        }),
      )}
    </svg>
  );
}
