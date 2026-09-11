import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import authService from "../services/auth.service.js";
import blockchainService from "../services/blockchain.service.js";

export interface DemoUserSeedResult {
  email: string;
  role: string;
  name: string;
  organization: string;
  walletAddress: string;
}

export async function seedDemoUsers(): Promise<DemoUserSeedResult[]> {
  console.log("-------------------------------------------------------");
  console.log("      SEEDING HONEYCHAIN DEMO USERS & ORGANIZATIONS     ");
  console.log("-------------------------------------------------------");

  // 1. Define Stakeholder Organizations with their Blockchain Wallets
  const orgDefinitions = [
    {
      name: "Sundarbans Apiary Cooperative",
      role: "beekeeper" as const,
      walletAddress: blockchainService.getWalletAddressForRole("beekeeper"),
    },
    {
      name: "National Honey Quality Testing Laboratory",
      role: "lab" as const,
      walletAddress: blockchainService.getWalletAddressForRole("lab"),
    },
    {
      name: "Bengal Organic Honey Processing Ltd",
      role: "processor" as const,
      walletAddress: blockchainService.getWalletAddressForRole("processor"),
    },
    {
      name: "SafeHive Cold Chain Logistics",
      role: "transporter" as const,
      walletAddress: blockchainService.getWalletAddressForRole("transporter"),
    },
    {
      name: "FSSAI Quality & Compliance Bureau",
      role: "auditor" as const,
      walletAddress: blockchainService.getWalletAddressForRole("auditor"),
    },
    {
      name: "HoneyChain Administrative Authority",
      role: "admin" as const,
      walletAddress: blockchainService.getWalletAddressForRole("admin"),
    },
  ];

  const orgMap: Record<string, any> = {};

  for (const orgDef of orgDefinitions) {
    const org = await Organization.findOneAndUpdate(
      { role: orgDef.role },
      {
        name: orgDef.name,
        role: orgDef.role,
        walletAddress: orgDef.walletAddress.toLowerCase(),
        isActive: true,
        status: "active",
      },
      { upsert: true, new: true }
    );
    orgMap[orgDef.role] = org;
    console.log(`✓ Organization seeded: ${org.name} (${org.role}) -> Wallet: ${org.walletAddress}`);
  }

  // 2. Define Demo Users for each role
  const password = env.DEMO_PASSWORD || "Password123!";
  const passwordHash = await authService.hashPassword(password);

  const userDefinitions = [
    {
      name: "System Administrator",
      email: "admin@honeychain.org",
      role: "admin" as const,
      organizationId: orgMap["admin"]._id,
      isOrgAdmin: false,
    },
    {
      name: "Rajesh Kumar (Beekeeper)",
      email: "beekeeper@honeychain.org",
      role: "beekeeper" as const,
      organizationId: orgMap["beekeeper"]._id,
      isOrgAdmin: true,
    },
    {
      name: "Dr. Ananya Sen (Laboratory Analyst)",
      email: "lab@honeychain.org",
      role: "lab" as const,
      organizationId: orgMap["lab"]._id,
      isOrgAdmin: true,
    },
    {
      name: "Vikram Patel (Processing Plant Lead)",
      email: "processor@honeychain.org",
      role: "processor" as const,
      organizationId: orgMap["processor"]._id,
      isOrgAdmin: true,
    },
    {
      name: "Gurpreet Singh (Transporter)",
      email: "transporter@honeychain.org",
      role: "transporter" as const,
      organizationId: orgMap["transporter"]._id,
      isOrgAdmin: true,
    },
    {
      name: "Priya Sharma (State Honey Auditor)",
      email: "auditor@honeychain.org",
      role: "auditor" as const,
      organizationId: orgMap["auditor"]._id,
      isOrgAdmin: true,
    },
  ];

  const results: DemoUserSeedResult[] = [];

  for (const userDef of userDefinitions) {
    const user = await User.findOneAndUpdate(
      { email: userDef.email },
      {
        name: userDef.name,
        email: userDef.email,
        passwordHash,
        role: userDef.role,
        organizationId: userDef.organizationId,
        walletAddress: orgMap[userDef.role]?.walletAddress,
        isOrgAdmin: userDef.isOrgAdmin,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Link admin user to organization
    if (userDef.isOrgAdmin && orgMap[userDef.role]) {
      orgMap[userDef.role].adminUserId = user._id;
      await orgMap[userDef.role].save();
    }

    const wallet = orgMap[userDef.role]?.walletAddress || "N/A";
    const orgName = orgMap[userDef.role]?.name || "Independent";

    results.push({
      email: user.email,
      role: user.role,
      name: user.name,
      organization: orgName,
      walletAddress: wallet,
    });

    console.log(`✓ Demo user seeded: ${user.name} <${user.email}> [Role: ${user.role}]`);
  }

  console.log("\n=======================================================");
  console.log("              DEMO CREDENTIALS REFERENCE               ");
  console.log("       Default Password for All: " + password);
  console.log("=======================================================");
  console.table(
    results.map((r) => ({
      Role: r.role.toUpperCase(),
      Email: r.email,
      Name: r.name,
      Organization: r.organization,
      "Blockchain Wallet": r.walletAddress.substring(0, 10) + "...",
    }))
  );

  return results;
}

// Standalone execution entrypoint
if (process.argv[1]?.endsWith("seedUsers.ts") || process.argv[1]?.endsWith("seedUsers.js")) {
  connectDB(env.MONGO_URI)
    .then(async () => {
      await seedDemoUsers();
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error seeding demo users:", err);
      process.exit(1);
    });
}
