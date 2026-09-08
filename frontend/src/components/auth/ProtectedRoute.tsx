// src/components/auth/ProtectedRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants";
import type { Role } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Roles allowed to view this subtree. Omit to just require "logged in,
   * any role" (rare — most dashboards should pass this).
   */
  allowedRoles?: Role[];
}

/**
 * Route protection happens here, client-side, not in middleware.ts —
 * the JWT lives in localStorage (not an httpOnly cookie the edge runtime
 * can read), a deliberate call made because backend and frontend sit on
 * different domains (Render / Vercel). See the previous chat's note on
 * cross-domain cookies for the full reasoning.
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Logged in, but wrong role for this section — send them to their
      // own dashboard rather than a dead end.
      router.replace(ROLE_DASHBOARD_PATH[user.role]);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper dark:bg-paper-dark">
        <div className="flex items-center gap-3 text-ink/60 dark:text-ink-dark/60">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-honey border-t-transparent" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null; // redirect effect is in flight
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}