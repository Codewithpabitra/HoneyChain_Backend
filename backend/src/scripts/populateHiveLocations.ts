// backend/src/scripts/populateHiveLocations.ts
import { Hive, Apiary } from "../models/index.js";

/**
 * Backfills location data for any Hive documents missing a location object.
 * Inherits coordinates from the parent Apiary with isApproximate: true.
 */
export async function populateHiveLocations(): Promise<{ updatedCount: number; totalChecked: number }> {
  const hivesWithoutLocation = await Hive.find({
    $or: [
      { location: { $exists: false } },
      { "location.latitude": { $exists: false } },
      { "location.latitude": null },
    ],
  });

  let updatedCount = 0;

  for (const hive of hivesWithoutLocation) {
    try {
      const apiary = await Apiary.findOne({
        $or: [{ _id: hive.apiary }, { apiaryId: hive.apiaryId }],
      }).lean();

      if (apiary && apiary.location && typeof apiary.location.latitude === "number") {
        hive.location = {
          latitude: apiary.location.latitude,
          longitude: apiary.location.longitude,
          address:
            apiary.location.address ||
            `${apiary.name}, ${apiary.location.region || "Local Apiary"}`,
          isApproximate: true,
        };
        await hive.save();
        updatedCount++;
      }
    } catch (err: any) {
      console.warn(`[PopulateHiveLocations] Failed to backfill hive ${hive.hiveId}:`, err.message);
    }
  }

  console.log(
    `[PopulateHiveLocations] Checked ${hivesWithoutLocation.length} hives without location; updated ${updatedCount}.`
  );

  return {
    updatedCount,
    totalChecked: hivesWithoutLocation.length,
  };
}

export default populateHiveLocations;
