// src/types/hive.ts
import type { ApiaryLocation } from "./apiary";

export type HiveStatus = "active" | "inactive" | "quarantined" | "collapsed";
export type HiveHealthStatus = "healthy" | "attention_needed" | "critical" | "unknown";

export interface HiveHealthSummary {
  healthScore?: number;
  status: HiveHealthStatus;
  stressIndex?: number;
  activeAlerts?: string[];
  latestReadingAt?: string;
}

export interface HiveDeviceMetadata {
  deviceId: string;
  gatewayId?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  communicationProtocol?: string;
  batteryLevelPct?: number;
  lastPingAt?: string;
}

export interface HiveQueenInfo {
  installedDate?: string;
  origin?: string;
  marked?: boolean;
  color?: string;
  breed?: string;
  ageMonths?: number;
}

export interface Hive {
  _id: string;
  hiveId: string;
  apiary: {
    _id: string;
    apiaryId: string;
    name: string;
    location: ApiaryLocation;
    floraType?: string[];
    capacity?: number;
  } | string;
  apiaryId: string;
  beekeeper: string;
  hiveType: string;
  beeSpecies: string;
  queenInfo?: HiveQueenInfo;
  installationDate?: string;
  status: HiveStatus;
  deviceMetadata?: HiveDeviceMetadata;
  currentHealthSummary?: HiveHealthSummary;
  organizationId?: {
    _id: string;
    name: string;
    walletAddress?: string;
  } | string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHivePayload {
  hiveId: string;
  apiary?: string;
  apiaryId?: string;
  hiveType?: string;
  beeSpecies?: string;
  queenInfo?: HiveQueenInfo;
  deviceMetadata?: Partial<HiveDeviceMetadata>;
  installationDate?: string;
  notes?: string;
}

export interface UpdateHivePayload {
  status?: HiveStatus;
  hiveType?: string;
  beeSpecies?: string;
  queenInfo?: HiveQueenInfo;
  deviceMetadata?: Partial<HiveDeviceMetadata>;
  notes?: string;
}

export interface HiveListResponse {
  success: boolean;
  data: Hive[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}