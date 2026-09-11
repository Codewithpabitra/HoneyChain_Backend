"use client";

import Link from "next/link";
import {
  IconMenu2,
  IconLogout,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_NAVIGATION } from "@/config/navigation";
import type { Role } from "@/types/auth";
import { BeeIcon } from "@/components/ui/BeeIcon";

interface MobileNavProps {
  role: string;
}

export default function MobileNav({ role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
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
            className="flex h-full w-72 flex-col justify-between border-r border-black/10 bg-paper p-5 dark:border-white/10 dark:bg-paper-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="mb-8 flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 text-xl font-bold"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-honey/10 text-honey ring-1 ring-honey/20">
                    <BeeIcon size={20} badge />
                  </div>
                  <span>
                    Honey<span className="text-honey">Chain</span>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Close navigation"
                >
                  <IconX size={20} />
                </button>
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
                        setOpen(false);
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
                          : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon size={19} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-black/60 hover:bg-red-500/10 hover:text-red-600 dark:text-white/60 dark:hover:text-red-400"
              >
                <IconLogout size={19} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}