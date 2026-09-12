// src/app/(transporter)/transporter/layout.tsx
"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function TransporterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["distributor", "transporter"]}>
      <DashboardShell role="distributor">
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
