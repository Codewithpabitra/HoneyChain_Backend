import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Organization } from "../models/Organization.js";
import { OrganizationApplication } from "../models/OrganizationApplication.js";
import { User } from "../models/User.js";

/**
 * Migration: Organization-Based Onboarding Schema & Data Backfill
 * 1. Synchronizes indexes on OrganizationApplication, Organization, and User.
 * 2. Backfills status: "active" on legacy Organization documents.
 * 3. Sets isOrgAdmin: true on the primary administrator user for each organization.
 */
export async function runOrganizationMigration(): Promise<{
  organizationsUpdated: number;
  usersUpdated: number;
}> {
  console.log("==================================================================");
  console.log("    HONEYCHAIN MIGRATION: ORGANIZATION-BASED ONBOARDING & RBAC    ");
  console.log("==================================================================");

  // 1. Sync indexes
  console.log("\n[1/3] Synchronizing MongoDB collection indexes...");
  await OrganizationApplication.syncIndexes();
  await Organization.syncIndexes();
  await User.syncIndexes();
  console.log("  ✓ Indexes synchronized on OrganizationApplication, Organization, and User.");

  // 2. Backfill Organization status
  console.log("\n[2/3] Backfilling Organization status...");
  const orgResult = await Organization.updateMany(
    {
      $or: [{ status: { $exists: false } }, { status: null }],
    },
    {
      $set: { status: "active", isActive: true },
    }
  );
  console.log(`  ✓ Updated ${orgResult.modifiedCount} legacy organizations with status: 'active'.`);

  // 3. Backfill Organization Admins
  console.log("\n[3/3] Backfilling initial Organization Admins...");
  const allOrgs = await Organization.find();
  let usersUpdated = 0;

  for (const org of allOrgs) {
    // Find the first user in this organization
    const firstUser = await User.findOne({ organizationId: org._id }).sort({ createdAt: 1 });
    if (firstUser && !firstUser.isOrgAdmin) {
      firstUser.isOrgAdmin = true;
      await firstUser.save();
      usersUpdated++;
      console.log(`  ✓ Designated Org Admin: ${firstUser.name} <${firstUser.email}> for '${org.name}'`);
    }

    if (!org.adminUserId && firstUser) {
      org.adminUserId = firstUser._id;
      await org.save();
    }
  }

  console.log(`\n==================================================================`);
  console.log(`✓ Migration Complete: ${orgResult.modifiedCount} orgs updated, ${usersUpdated} org admins assigned.`);
  console.log(`==================================================================\n`);

  return {
    organizationsUpdated: orgResult.modifiedCount,
    usersUpdated,
  };
}

// Standalone CLI invocation
if (process.argv[1]?.endsWith("migrateOrgApplications.ts") || process.argv[1]?.endsWith("migrateOrgApplications.js")) {
  connectDB(env.MONGO_URI)
    .then(async () => {
      await runOrganizationMigration();
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

export default runOrganizationMigration;
