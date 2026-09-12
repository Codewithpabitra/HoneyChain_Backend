// src/types/harvest.ts

export interface Harvest {
  _id: string;
  harvestId: string;
  hiveId: string;
  apiaryId?: string;
  beekeeperId: string;
  organizationId?: string;
  quantityGrams: number;
  harvestTimestamp: number;
  floralOrigin?: string;
  batchId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHarvestPayload {
  harvestId?: string;
  hiveId: string;
  quantityGrams: number;
  harvestTimestamp?: number;
  floralOrigin?: string;
  batchId?: string;
  notes?: string;
}

export interface HarvestListResponse {
  success: boolean;
  count: number;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  data: Harvest[];
}