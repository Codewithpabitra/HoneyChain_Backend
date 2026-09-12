// src/app/(lab)/lab/layout.tsx
"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["lab"]}>
      <DashboardShell role="lab">
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
