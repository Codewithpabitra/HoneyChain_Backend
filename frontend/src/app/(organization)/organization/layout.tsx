// src/app/(organization)/organization/layout.tsx
"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/components/providers/AuthProvider";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const safeRole = user?.role || "beekeeper";

  return (
    <ProtectedRoute>
      <DashboardShell role={safeRole}>
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
