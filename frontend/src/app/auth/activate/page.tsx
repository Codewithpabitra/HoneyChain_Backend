// src/app/auth/activate/page.tsx
"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IconCheck,
  IconLock,
  IconShieldCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { organizationService } from "@/services/organization.service";
import { TOKEN_STORAGE_KEY, ROLE_DASHBOARD_PATH } from "@/lib/constants";
import type { Role } from "@/types/auth";

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Activation token is missing or invalid.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await organizationService.activateAccount(
        token.trim(),
        password
      );

      // Save token to localStorage for authenticated session
      if (response.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      }

      setSuccess(true);

      // Redirect to appropriate role dashboard after short delay
      const userRole = (response.user as { role?: Role })?.role || "beekeeper";
      const targetPath = ROLE_DASHBOARD_PATH[userRole] || "/farmer/dashboard";

      setTimeout(() => {
        router.push(targetPath);
      }, 2000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to activate account. The activation token may have expired or already been used.";
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
        <div className="relative z-10">
          <span className="font-mono text-sm tracking-tight text-honey-light">
            HoneyChain
          </span>
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-3xl leading-snug text-paper/95">
            Activate your Organization Administrator account.
          </p>
          <p className="mt-6 text-sm text-paper/60">
            Your organization application has been approved by HoneyChain
            Administration. Choose a secure password to complete your account
            activation and access your organization dashboard.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12 dark:bg-paper-dark">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-honey/10 text-honey">
              <IconShieldCheck size={24} stroke={1.8} />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink dark:text-ink-dark">
              Account Activation
            </h1>
            <p className="mt-1.5 text-sm text-ink/60 dark:text-ink-dark/60">
              Set your initial password to activate your organization admin credentials.
            </p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-verified/15 text-verified">
                <IconCheck size={28} stroke={2} />
              </div>
              <h2 className="text-lg font-semibold text-ink dark:text-ink-dark">
                Account Activated!
              </h2>
              <p className="text-sm text-ink/60 dark:text-ink-dark/60">
                Your password has been securely configured. Redirecting you to your HoneyChain dashboard…
              </p>
              <div className="pt-4">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-honey border-t-transparent" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="token"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Activation Token
                </label>
                <input
                  id="token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="One-time activation token"
                  className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Set Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                  <IconLock
                    size={16}
                    className="absolute right-3.5 top-3 text-ink/35 dark:text-ink-dark/35"
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink/45 dark:text-ink-dark/45">
                  Must be at least 6 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/70 dark:text-ink-dark/70"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-honey dark:border-white/15 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
                  />
                  <IconLock
                    size={16}
                    className="absolute right-3.5 top-3 text-ink/35 dark:text-ink-dark/35"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-alert/10 p-3 text-xs text-alert">
                  <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "flex h-11 w-full items-center justify-center rounded-xl bg-honey px-4 text-sm font-semibold text-comb transition-colors",
                  "hover:bg-honey-light disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isSubmitting ? "Activating account…" : "Activate Account & Sign in"}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs text-ink/50 transition hover:text-ink dark:text-ink-dark/50 dark:hover:text-ink-dark"
                >
                  Already activated? Go to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper dark:bg-paper-dark">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-honey border-t-transparent" />
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}

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
        })
      )}
    </svg>
  );
}
