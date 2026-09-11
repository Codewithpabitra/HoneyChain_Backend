// src/types/apiary.ts

export interface ApiaryLocation {
  latitude: number;
  longitude: number;
  region: string;
  address?: string;
  elevationMeters?: number;
  coordinates?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface Apiary {
  _id: string;
  apiaryId: string;
  name: string;
  beekeeper: string;
  beekeeperContact?: string;
  location: ApiaryLocation;
  floraType: string[];
  capacity: number;
  status: "active" | "inactive" | "quarantined";
  hives: any[];
  hiveCount?: number;
  cluster?: string;
  organizationId?: {
    _id: string;
    name: string;
    walletAddress?: string;
  } | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiaryPayload {
  apiaryId?: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    region: string;
    address?: string;
    elevationMeters?: number;
  };
  floraType?: string[];
  capacity?: number;
  beekeeper?: string;
  beekeeperContact?: string;
  notes?: string;
}

export interface UpdateApiaryPayload {
  name?: string;
  location?: Partial<ApiaryLocation>;
  floraType?: string[];
  capacity?: number;
  status?: "active" | "inactive" | "quarantined";
  notes?: string;
}
