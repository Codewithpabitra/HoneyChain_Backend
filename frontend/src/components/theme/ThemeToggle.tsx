"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-full border border-ink/10 dark:border-ink-dark/10" />
    );
  }

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    // Create the expanding circle from the top-right corner
    const root = document.documentElement;

    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const radius = Math.hypot(window.innerWidth, window.innerHeight);

      root.animate(
        [
          {
            clipPath: `circle(0px at 100% 0%)`,
          },
          {
            clipPath: `circle(${radius}px at 100% 0%)`,
          },
        ],
        {
          duration: 650,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-paper/60 text-ink transition-all duration-300 hover:border-honey/40 hover:bg-honey/10 dark:border-ink-dark/10 dark:bg-paper-dark/60 dark:text-ink-dark"
    >
      <span
        className="absolute inset-0 rounded-full bg-honey/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <span className="relative z-10 transition-transform duration-300 group-hover:rotate-12">
        {isDark ? (
          <IconSun size={17} stroke={1.8} />
        ) : (
          <IconMoon size={17} stroke={1.8} />
        )}
      </span>
    </button>
  );
}