"use client";

import Link from "next/link";
import {
  IconLogout,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_NAVIGATION } from "@/config/navigation";
import type { Role } from "@/types/auth";

interface MobileNavProps {
  role: Role;
}

export default function MobileNav({ role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  const navigation = ROLE_NAVIGATION[role];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/30 lg:hidden"
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
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="text-xl font-bold tracking-tight"
              >
                Honey<span className="text-honey">Chain</span>
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Close navigation"
              >
                <IconX size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-honey/10 text-ink dark:text-ink-dark"
                        : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-black/60 transition hover:bg-red-500/10 hover:text-red-600 dark:text-white/60 dark:hover:text-red-400"
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