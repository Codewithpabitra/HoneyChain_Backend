// src/app/(authority)/authority/layout.tsx
"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AuthorityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const safeRole = user?.role === "auditor" ? "auditor" : "admin";

  return (
    <ProtectedRoute allowedRoles={["admin", "auditor"]}>
      <DashboardShell role={safeRole}>
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
