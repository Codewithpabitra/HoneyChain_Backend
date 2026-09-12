"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { IconLogout, IconUsers } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_NAVIGATION } from "@/config/navigation";
import type { Role } from "@/types/auth";
import { BeeIcon } from "@/components/ui/BeeIcon";

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(typeof window !== "undefined" ? window.location.hash : "");
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, [pathname]);

  const safeRole = (role as Role) || "beekeeper";
  const baseNavigation = ROLE_NAVIGATION[safeRole] || [];
  const hasOrgMembersLink = baseNavigation.some((item) => item.href === "/organization/members");
  const navigation = [
    ...baseNavigation,
    ...(user?.isOrgAdmin && !hasOrgMembersLink
      ? [
          {
            label: "Org Members",
            href: "/organization/members",
            icon: IconUsers,
          },
        ]
      : []),
  ];

  const orgName =
    typeof user?.organization === "object" && user.organization !== null
      ? typeof user.organization.name === "string"
        ? user.organization.name
        : undefined
      : undefined;

  const isItemActive = (href: string) => {
    const [itemPath, itemHash] = href.split("#");

    if (itemHash) {
      return pathname === itemPath && currentHash === `#${itemHash}`;
    }

    if (pathname === itemPath) {
      // If there's an active hash link matching the current route, don't mark base route active
      const hasMatchingHashItem = navigation.some((nav) => {
        const [p, h] = nav.href.split("#");
        return p === pathname && h && currentHash === `#${h}`;
      });
      return !hasMatchingHashItem;
    }

    return false;
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-black/10 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/3 lg:flex">
      <div>
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-honey/10 text-honey ring-1 ring-honey/20 transition-transform group-hover:scale-105">
              <BeeIcon size={22} badge />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Honey<span className="text-honey">Chain</span>
            </span>
          </Link>

          <p className="mt-2 text-xs capitalize text-black/50 dark:text-white/50">
            {role}
            {user?.isOrgAdmin ? " • Org Admin" : ""}
          </p>
          {orgName && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-honey">
              {orgName}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.href.includes("#")) {
                    const hash = item.href.substring(item.href.indexOf("#"));
                    setCurrentHash(hash);
                  } else {
                    setCurrentHash("");
                    if (pathname === item.href && typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-honey/10 text-ink dark:text-ink-dark font-semibold"
                    : "text-black/60 hover:bg-black/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={logout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-black/60 transition hover:bg-red-500/10 hover:text-red-600 dark:text-white/60 dark:hover:text-red-400"
        >
          <IconLogout size={19} />
          Logout
        </button>
      </div>
    </aside>
  );
}