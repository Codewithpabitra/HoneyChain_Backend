"use client";

import type { ReactNode } from "react";
import type { Role } from "@/types/auth";

import Sidebar from "./Sidebar";
import Topbar from "../../components/dashboard/Topbar";
import MobileNav from "./MobileNav";

interface DashboardShellProps {
  children: ReactNode;
  role: Role;
}

export default function DashboardShell({
  children,
  role,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-paper-dark dark:text-ink-dark">
      <div className="flex min-h-screen">
        <Sidebar role={role} />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <MobileNav role={role} />

          <Topbar />

          <main className="flex-1 p-5 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}