// src/app/(farmer)/farmer/layout.tsx
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["beekeeper"]}>
      {/* Swap this div for <DashboardShell> once Sidebar/Topbar exist —
          same pattern applies to (lab), (processor), (authority) layouts:
          wrap in ProtectedRoute with that group's role(s). */}
      <div className="min-h-screen bg-paper dark:bg-paper-dark">
        {children}
      </div>
    </ProtectedRoute>
  );
}