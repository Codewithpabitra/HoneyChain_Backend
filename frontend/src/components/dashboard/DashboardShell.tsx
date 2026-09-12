"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";
import { PageTransition } from "@/components/ui/MotionComponents";
import { HoneycombMatrix } from "@/components/ui/BeeIcon";

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
    <div className="relative min-h-screen bg-paper text-ink dark:bg-paper-dark dark:text-ink-dark">
      {/* Ambient background honeycomb lattice (ultra-subtle, non-casual) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden text-honey opacity-[0.025] dark:opacity-[0.035]">
        <HoneycombMatrix className="h-full w-full" />
      </div>

      <div className="relative z-1 flex min-h-screen">
        <Sidebar role={role} />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
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