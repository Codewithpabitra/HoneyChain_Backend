"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";
import { PageTransition } from "@/components/ui/MotionComponents";

interface DashboardShellProps {
  children: ReactNode;
  role: string;
}

export default function DashboardShell({
  children,
  role,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-paper-dark dark:text-ink-dark">
      <div className="flex min-h-screen">
        <Sidebar role={role} />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav role={role} />
          <Topbar />

          <main className="flex-1 p-5 md:p-8">
            <PageTransition key={pathname}>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}