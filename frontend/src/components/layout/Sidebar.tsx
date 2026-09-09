import Link from "next/link";
import { IconLogout, IconUsers } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_NAVIGATION } from "@/config/navigation";
import type { Role } from "@/types/auth";

interface SidebarProps {
  role: Role;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

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
    typeof user?.organization === "object"
      ? user?.organization?.name
      : undefined;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-black/10 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/3 lg:flex lg:flex-col">
      <div className="mb-8">
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

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-honey/10 text-ink dark:text-ink-dark"
                  : "text-black/60 hover:bg-black/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
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
  );
}