"use client";

import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { BeeIcon } from "@/components/ui/BeeIcon";

export default function Header() {
  const { user, logout } = useAuth();

  const dashboardHref =
    user?.role === "admin" || user?.role === "auditor"
      ? "/authority/dashboard"
      : user?.role === "beekeeper"
      ? "/farmer/dashboard"
      : user?.role === "lab"
      ? "/lab/dashboard"
      : user?.role === "processor"
      ? "/processor/dashboard"
      : user?.role === "distributor" || user?.role === "transporter"
      ? "/distributor/dashboard"
      : "/login";

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-6 md:px-12 py-5 flex items-center justify-between backdrop-blur-md bg-paper/70 dark:bg-paper-dark/70 border-b border-ink/5 dark:border-ink-dark/5">
      <Link
        href="/"
        className="flex items-center gap-2.5 group transition-transform"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-honey/10 text-honey ring-1 ring-honey/20 transition-transform group-hover:scale-105">
          <BeeIcon size={20} />
        </div>
        <span className="font-mono italic text-xl text-ink dark:text-ink-dark">
          HoneyChain
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70 dark:text-ink-dark/70">
        <Link href="/verify" className="hover:text-honey transition-colors">
          Verify a jar
        </Link>
        <Link href="/about" className="hover:text-honey transition-colors">
          About
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-2">
            <Link href={dashboardHref}>
              <Button size="sm" variant="outline">
                Dashboard
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={logout}
              className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="outline">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
