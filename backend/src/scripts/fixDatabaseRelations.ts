import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import { Apiary } from "../models/Apiary.js";
import { Hive } from "../models/Hive.js";
import { Batch } from "../models/Batch.js";
import { Alert } from "../models/Alert.js";
import { Harvest } from "../models/Harvest.js";
import { AIPrediction } from "../models/AIPrediction.js";

async function fixRelations() {
  console.log("\n=======================================================");
  console.log("       HONEYCHAIN DATABASE RELATION REPAIR SCRIPT       ");
  console.log("=======================================================\n");

  await connectDB(env.MONGO_URI);

  // 1. Locate the beekeeper user and beekeeper organization
  const beekeeperUser = await User.findOne({ email: "beekeeper@honeychain.org" });
  if (!beekeeperUser) {
    throw new Error("User beekeeper@honeychain.org not found!");
  }
  console.log(`Found Beekeeper User: ${beekeeperUser.name} (${beekeeperUser._id})`);

  let beekeeperOrg = await Organization.findOne({ role: "beekeeper" });
  if (!beekeeperOrg) {
    beekeeperOrg = await Organization.create({
      name: "Sundarbans Apiary Cooperative",
      role: "beekeeper",
      walletAddress: "0x111748e2d54d3f151746af8b508ce8ad626d7a93",
      isActive: true,
      status: "active",
    });
    console.log(`Created Beekeeper Organization: ${beekeeperOrg.name} (${beekeeperOrg._id})`);
  } else {
    console.log(`Found Beekeeper Organization: ${beekeeperOrg.name} (${beekeeperOrg._id})`);
  }

  // Ensure user has walletAddress and organizationId
  beekeeperUser.organizationId = beekeeperOrg._id as any;
  beekeeperUser.walletAddress = beekeeperOrg.walletAddress;
  beekeeperUser.isOrgAdmin = true;
  beekeeperUser.isActive = true;
  await beekeeperUser.save();
  console.log("✓ Beekeeper User updated with organizationId and walletAddress.");

  // Also update other role users to ensure walletAddress is set
  const allOrgs = await Organization.find({});
  for (const org of allOrgs) {
    await User.updateMany(
      { organizationId: org._id, walletAddress: { $exists: false } },
      { $set: { walletAddress: org.walletAddress } }
    );
  }

  // 2. Associate all Apiaries with the Beekeeper Organization
  const apiaries = await Apiary.find({});
  console.log(`\nFound ${apiaries.length} Apiaries to update.`);
  for (const apiary of apiaries) {
    apiary.organizationId = beekeeperOrg._id as any;
    apiary.createdBy = beekeeperUser._id as any;
    apiary.beekeeper = beekeeperUser.email;
    if (!apiary.beekeeperContact) {
      apiary.beekeeperContact = {
        name: beekeeperUser.name,
        email: beekeeperUser.email,
        phone: "+91 98300 12345",
      };
    }
    await apiary.save();
    console.log(`✓ Apiary ${apiary.apiaryId} (${apiary.name}) linked to organization ${beekeeperOrg.name}`);
  }

  // 3. Associate all Hives with the Beekeeper Organization & Apiary
  const hives = await Hive.find({});
  console.log(`\nFound ${hives.length} Hives to update.`);
  for (const hive of hives) {
    hive.organizationId = beekeeperOrg._id as any;
    hive.createdBy = beekeeperUser._id as any;
    hive.beekeeper = beekeeperUser.email;

    // Ensure apiary object reference is valid
    if (!hive.apiary && hive.apiaryId) {
      const parentApiary = apiaries.find(a => a.apiaryId === hive.apiaryId);
      if (parentApiary) {
        hive.apiary = parentApiary._id as any;
      }
    }
    await hive.save();
    console.log(`✓ Hive ${hive.hiveId} linked to org ${beekeeperOrg.name} and beekeeper ${beekeeperUser.email}`);
  }

  // Ensure Apiaries have the hive ObjectIds in their `hives` array
  for (const apiary of apiaries) {
    const matchingHives = hives.filter(h => h.apiaryId === apiary.apiaryId);
    apiary.hives = matchingHives.map(h => h._id as any);
    await apiary.save();
    console.log(`✓ Apiary ${apiary.apiaryId} updated with ${matchingHives.length} hive references.`);
  }

  // 4. Update Batches
  const batches = await Batch.find({});
  console.log(`\nFound ${batches.length} Batches to associate.`);
  for (const batch of batches) {
    batch.organizationId = beekeeperOrg._id as any;
    batch.createdBy = beekeeperUser._id as any;
    if (!batch.producer) {
      batch.producer = beekeeperOrg.walletAddress;
    }
    if (!batch.currentCustodian) {
      batch.currentCustodian = beekeeperOrg.walletAddress;
    }
    await batch.save();
    console.log(`✓ Batch ${batch.batchId} linked to organization ${beekeeperOrg.name}`);
  }

  // 5. Update Predictions
  await AIPrediction.updateMany(
    {},
    { $set: { organizationId: beekeeperOrg._id } }
  );
  console.log("✓ AI Predictions associated with organization.");

  // 6. Seed demo Alerts for the Beekeeper if none exist
  const existingAlertCount = await Alert.countDocuments({ organizationId: beekeeperOrg._id });
  if (existingAlertCount === 0) {
    console.log("\nSeeding demo anomaly alerts for beekeeper hives...");
    const alertsToSeed = [
      {
        hiveId: "HIVE-SB-101",
        apiaryId: "APIARY-SB-01",
        organizationId: beekeeperOrg._id,
        severity: "warning" as const,
        alertType: "TEMPERATURE_HIGH",
        message: "Hive internal temperature elevated (37.2°C). Brood overheating risk.",
        isResolved: false,
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        hiveId: "HIVE-SB-102",
        apiaryId: "APIARY-SB-01",
        organizationId: beekeeperOrg._id,
        severity: "info" as const,
        alertType: "BATTERY_LOW",
        message: "ESP32 IoT Gateway battery level at 89%. Solar recharging active.",
        isResolved: false,
        createdAt: new Date(Date.now() - 3600000 * 12),
      },
      {
        hiveId: "HIVE-KV-201",
        apiaryId: "APIARY-KV-02",
        organizationId: beekeeperOrg._id,
        severity: "critical" as const,
        alertType: "SWARM_RISK",
        message: "Acoustic frequency shift detected: high probability of queen swarming event within 48h.",
        isResolved: false,
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    ];
    await Alert.insertMany(alertsToSeed);
    console.log(`✓ Seeded ${alertsToSeed.length} anomaly alerts.`);
  }

  // 7. Seed demo Harvests for the Beekeeper if none exist
  const existingHarvestCount = await Harvest.countDocuments({ organizationId: beekeeperOrg._id });
  if (existingHarvestCount === 0) {
    console.log("\nSeeding demo honey extractions for beekeeper...");
    const harvestsToSeed = [
      {
        harvestId: "HRV-2026-SB-01",
        hiveId: "HIVE-SB-101",
        apiaryId: "APIARY-SB-01",
        beekeeperId: beekeeperUser.email,
        organizationId: beekeeperOrg._id,
        quantityGrams: 28500,
        harvestTimestamp: Date.now() - 86400000 * 3,
        floralOrigin: "Mangrove Wildflower",
        notes: "Spring extraction - dense aroma, low moisture amber honey.",
      },
      {
        harvestId: "HRV-2026-SB-02",
        hiveId: "HIVE-SB-102",
        apiaryId: "APIARY-SB-01",
        beekeeperId: beekeeperUser.email,
        organizationId: beekeeperOrg._id,
        quantityGrams: 24200,
        harvestTimestamp: Date.now() - 86400000 * 2,
        floralOrigin: "Mangrove Wildflower",
        notes: "Rich wildflower blend from outer buffer blocks.",
      },
      {
        harvestId: "HRV-2026-KV-01",
        hiveId: "HIVE-KV-201",
        apiaryId: "APIARY-KV-02",
        beekeeperId: beekeeperUser.email,
        organizationId: beekeeperOrg._id,
        quantityGrams: 35000,
        harvestTimestamp: Date.now() - 86400000 * 1,
        floralOrigin: "Robinia Acacia",
        notes: "High altitude single-origin white acacia honey.",
      },
    ];
    await Harvest.insertMany(harvestsToSeed);
    console.log(`✓ Seeded ${harvestsToSeed.length} honey harvest extractions.`);
  }

  console.log("\n=======================================================");
  console.log("       ALL RELATIONAL INCONSISTENCIES RESOLVED!        ");
  console.log("=======================================================\n");

  await disconnectDB();
}

fixRelations().catch((err) => {
  console.error("Error repairing relations:", err);
  process.exit(1);
});
