"use client";

import { IconSun, IconMoon, IconLogout } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Topbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/10 bg-white/70 px-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20 md:px-8">
      <div>
        <p className="text-sm font-medium">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </p>
        <p className="hidden text-xs text-black/50 dark:text-white/50 sm:block">
          Manage your HoneyChain operations
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white/70 transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <IconSun size={18} />
          ) : (
            <IconMoon size={18} />
          )}
        </button>

        {/* User Initials */}
        <div 
          className="flex h-9 w-9 items-center justify-center rounded-full bg-honey/15 text-sm font-semibold text-ink dark:text-ink-dark"
          title={user?.name || user?.email || "User profile"}
        >
          {user?.name?.charAt(0).toUpperCase() ?? "U"}
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white/70 px-3 text-xs font-medium text-black/60 transition hover:bg-red-500/10 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          title="Log out of HoneyChain"
        >
          <IconLogout size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}