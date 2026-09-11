import type { Role } from "@/types/auth";
import {
  IconActivity,
  IconAlertTriangle,
  IconBox,
  IconBuildingCommunity,
  IconChartBar,
  IconClipboardCheck,
  IconHexagon,
  IconHome,
  IconPackage,
  IconRoute,
  IconUsers,
} from "@tabler/icons-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: typeof IconHome;
}

export const ROLE_NAVIGATION: Record<Role, NavigationItem[]> = {
  beekeeper: [
    {
      label: "Dashboard",
      href: "/farmer/dashboard",
      icon: IconHome,
    },
    {
      label: "My Hives",
      href: "/farmer/hives",
      icon: IconHexagon,
    },
    {
      label: "Analytics",
      href: "/farmer/analytics",
      icon: IconChartBar,
    },
    {
      label: "Alerts",
      href: "/farmer/alerts",
      icon: IconAlertTriangle,
    },
    {
      label: "Harvests",
      href: "/farmer/harvests",
      icon: IconPackage,
    },
    {
      label: "Batches",
      href: "/farmer/batches",
      icon: IconBox,
    },
  ],

  lab: [
    {
      label: "Dashboard",
      href: "/lab/dashboard",
      icon: IconHome,
    },
    {
      label: "Quality Tests",
      href: "/lab/tests",
      icon: IconClipboardCheck,
    },
  ],

  processor: [
    {
      label: "Dashboard",
      href: "/processor/dashboard",
      icon: IconHome,
    },
    {
      label: "Harvests",
      href: "/processor/harvests",
      icon: IconPackage,
    },
    {
      label: "Batches",
      href: "/processor/batches",
      icon: IconBox,
    },
    {
      label: "Processing",
      href: "/processor/processing",
      icon: IconActivity,
    },
    {
      label: "Packaging",
      href: "/processor/packaging",
      icon: IconPackage,
    },
    {
      label: "Shipments",
      href: "/processor/shipments",
      icon: IconRoute,
    },
  ],

  distributor: [
    {
      label: "Dashboard",
      href: "/distributor/dashboard",
      icon: IconHome,
    },
  ],

  transporter: [
    {
      label: "Dashboard",
      href: "/distributor/dashboard",
      icon: IconHome,
    },
  ],

  auditor: [
    {
      label: "Dashboard",
      href: "/authority/dashboard",
      icon: IconHome,
    },
    {
      label: "Farmers",
      href: "/authority/farmers",
      icon: IconUsers,
    },
    {
      label: "Hives",
      href: "/authority/hives",
      icon: IconHexagon,
    },
    {
      label: "Clusters",
      href: "/authority/clusters",
      icon: IconRoute,
    },
    {
      label: "Analytics",
      href: "/authority/analytics",
      icon: IconChartBar,
    },
    {
      label: "Alerts",
      href: "/authority/alerts",
      icon: IconAlertTriangle,
    },
    {
      label: "Blockchain",
      href: "/authority/blockchain",
      icon: IconActivity,
    },
  ],

  admin: [
    {
      label: "Dashboard",
      href: "/authority/dashboard",
      icon: IconHome,
    },
    {
      label: "Org Requests",
      href: "/authority/dashboard#requests",
      icon: IconBuildingCommunity,
    },
    {
      label: "Users",
      href: "/authority/users",
      icon: IconUsers,
    },
    {
      label: "Blockchain",
      href: "/authority/blockchain",
      icon: IconActivity,
    },
  ],
};