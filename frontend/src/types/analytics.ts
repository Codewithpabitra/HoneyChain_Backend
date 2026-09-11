// src/types/analytics.ts

export interface DashboardStats {
  role: string;
  hives: {
    total: number;
    active: number;
    inactive: number;
    healthy: number;
    averageHealthScore: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
    info: number;
  };
  batches: {
    total: number;
    created: number;
    inTransit: number;
    delivered: number;
    recalled: number;
    tested: number;
    totalQuantityKg: number;
  };
  harvests: {
    total: number;
    totalQuantityGrams: number;
    totalQuantityKg: number;
  };
  telemetry: {
    totalReadings: number;
    last24hReadings: number;
  };
  ai: {
    totalPredictions: number;
    anomaliesDetected: number;
    highStressRiskCount: number;
  };
  organizations?: {
    total: number;
  };
}

export interface ClusterApiaryItem {
  id: string;
  apiaryId: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    region: string;
    address?: string;
  };
  hiveCount: number;
}

export interface ClusterInfo {
  region: string;
  cluster?: string;
  apiaryCount: number;
  totalApiaries?: number;
  totalHives: number;
  avgLatitude: number;
  avgLongitude: number;
  farmerCount: number;
  apiaries: ClusterApiaryItem[];
}

export interface ClustersResponse {
  success: boolean;
  summary: {
    activeClusters: number;
    farmersCovered: number;
    hivesCovered: number;
  };
  data: ClusterInfo[];
}
