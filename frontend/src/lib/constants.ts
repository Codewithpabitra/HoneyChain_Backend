import type { Role } from "@/types/auth";

export const TOKEN_STORAGE_KEY = "honeychain_token";

export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  beekeeper: "/farmer/dashboard",
  lab: "/lab/dashboard",
  processor: "/processor/dashboard",
  auditor: "/authority/dashboard",
  admin: "/authority/dashboard",
  distributor: "/distributor/dashboard",
  transporter: "/distributor/dashboard",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  beekeeper: "Beekeeper",
  processor: "Processor",
  lab: "Laboratory Analyst",
  distributor: "Distributor",
  transporter: "Distributor",
  auditor: "Auditor",
};