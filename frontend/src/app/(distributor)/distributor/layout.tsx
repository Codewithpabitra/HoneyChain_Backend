// src/app/(distributor)/distributor/layout.tsx
"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DistributorLayout({
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
