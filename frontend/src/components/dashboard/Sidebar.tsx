"use client";

import Link from "next/link";
import { IconLayoutDashboard, IconLogout } from "@tabler/icons-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-black/10 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/3 lg:flex lg:flex-col">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Honey<span className="text-honey">Chain</span>
        </Link>

        <p className="mt-1 text-xs capitalize text-black/50 dark:text-white/50">
          {role}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        <Link
          href={`/${role === "beekeeper" ? "farmer" : role}/dashboard`}
          className="flex items-center gap-3 rounded-xl bg-honey/10 px-4 py-3 text-sm font-medium text-ink transition hover:bg-honey/20 dark:text-ink-dark"
        >
          <IconLayoutDashboard size={19} />
          Dashboard
        </Link>
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm text-black/60 transition hover:bg-red-500/10 hover:text-red-600 dark:text-white/60 dark:hover:text-red-400"
      >
        <IconLogout size={19} />
        Logout
      </button>
    </aside>
  );
}