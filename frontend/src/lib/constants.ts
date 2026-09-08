// src/lib/constants.ts
import type { Role } from "@/types/auth";

export const TOKEN_STORAGE_KEY = "honeychain_token";

/**
 * Where each role lands after login.
 *
 * NOTE — two open items from the planned file structure that need a team
 * decision before this goes further:
 *   1. The "beekeeper" role maps to the (farmer) route group. The naming
 *      differs (API/DB says "beekeeper", folder says "farmer"). Kept as-is
 *      since renaming route groups is a bigger refactor — flagging it here
 *      so it isn't a silent inconsistency.
 *   2. There is no (admin) or (transporter) route group yet in the planned
 *      structure, only (farmer), (lab), (processor), (authority). Both
 *      roles are temporarily routed to /authority below. Create dedicated
 *      route groups for them and update this map when you do.
 */
export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  beekeeper: "/farmer/dashboard",
  lab: "/lab/dashboard",
  processor: "/processor/dashboard",
  auditor: "/authority/dashboard",
  admin: "/authority/dashboard", // TODO: replace once an (admin) group exists
  transporter: "/authority/dashboard", // TODO: replace once a (transporter) group exists
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  beekeeper: "Beekeeper",
  processor: "Processor",
  lab: "Laboratory Analyst",
  transporter: "Transporter",
  auditor: "Auditor",
};