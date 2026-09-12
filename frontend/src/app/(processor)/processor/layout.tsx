// src/app/(processor)/processor/layout.tsx
"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function ProcessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["processor"]}>
      <DashboardShell role="processor">
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
