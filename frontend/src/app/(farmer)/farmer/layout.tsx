"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["beekeeper"]}>
      <DashboardShell role="beekeeper">
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}