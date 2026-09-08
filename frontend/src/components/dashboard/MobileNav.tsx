"use client";

import Link from "next/link";
import {
  IconLayoutDashboard,
  IconMenu2,
  IconLogout,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

interface MobileNavProps {
  role: string;
}

export default function MobileNav({ role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();

  const dashboardPath =
    role === "beekeeper" ? "/farmer/dashboard" : `/${role}/dashboard`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/40 lg:hidden"
        aria-label="Open navigation"
      >
        <IconMenu2 size={19} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="flex h-full w-72 flex-col border-r border-black/10 bg-paper p-5 dark:border-white/10 dark:bg-paper-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="text-xl font-bold"
              >
                Honey<span className="text-honey">Chain</span>
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <IconX size={20} />
              </button>
            </div>

            <nav className="flex-1">
              <Link
                href={dashboardPath}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl bg-honey/10 px-4 py-3 text-sm font-medium"
              >
                <IconLayoutDashboard size={19} />
                Dashboard
              </Link>
            </nav>

            <button
              type="button"
              onClick={logout}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm text-black/60 hover:bg-red-500/10 hover:text-red-600 dark:text-white/60 dark:hover:text-red-400"
            >
              <IconLogout size={19} />
              Logout
            </button>
          </aside>
        </div>
      )}
    </>
  );
}