"use client";

import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Button from "@/components/ui/Button";

export default function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-6 md:px-12 py-5 flex items-center justify-between backdrop-blur-md bg-paper/70 dark:bg-paper-dark/70 border-b border-ink/5 dark:border-ink-dark/5">
      <Link
        href="/"
        className="font-mono italic text-xl text-ink dark:text-ink-dark"
      >
        HoneyChain
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
        <Link href="/login">
          <Button size="sm" variant="outline">
            Sign in
          </Button>
        </Link>
      </div>
    </header>
  );
}
