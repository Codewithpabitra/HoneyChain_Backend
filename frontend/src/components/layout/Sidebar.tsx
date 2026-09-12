import { useState, useEffect } from "react";
import Link from "next/link";
import { IconLogout, IconUsers } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_NAVIGATION } from "@/config/navigation";
import type { Role } from "@/types/auth";
import { useUnresolvedAlertsCount } from "@/hooks/useUnresolvedAlertsCount";

interface SidebarProps {
  role: Role;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [currentHash, setCurrentHash] = useState("");
  const { count: unresolvedAlertsCount } = useUnresolvedAlertsCount();

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

  const baseNavigation = ROLE_NAVIGATION[role] || [];
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
      const hasMatchingHashItem = navigation.some((nav) => {
        const [p, h] = nav.href.split("#");
        return p === pathname && h && currentHash === `#${h}`;
      });
      return !hasMatchingHashItem;
    }

    return false;
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-black/10 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 lg:flex">
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className="mb-8 shrink-0">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Honey<span className="text-honey">Chain</span>
          </Link>

          <p className="mt-1 text-xs capitalize text-black/50 dark:text-white/50">
            {role}
            {user?.isOrgAdmin ? " • Org Admin" : ""}
          </p>
          {orgName && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-honey">
              {orgName}
            </p>
          )}
        </div>

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
                <span className="flex-1">{item.label}</span>
                {item.label === "Alerts" && unresolvedAlertsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-black/40 animate-pulse">
                    {unresolvedAlertsCount > 99 ? "99+" : unresolvedAlertsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 pt-4 border-t border-black/10 dark:border-white/10">
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