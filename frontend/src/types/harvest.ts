export interface Harvest {
  _id: string;
  harvestId: string;
  hiveId: string;
  beekeeperId: string;
  quantityGrams: number;
  harvestTimestamp: number;
  floralOrigin?: string;
  batchId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHarvestPayload {
  harvestId?: string;
  hiveId: string;
  quantityGrams: number;
  harvestTimestamp?: number;
  floralOrigin?: string;
}