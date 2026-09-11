// src/types/alert.ts

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  _id: string;
  alertId?: string;
  title?: string;
  hiveId: string;
  apiaryId?: string;
  organizationId?: string;
  severity: AlertSeverity;
  alertType: string;
  message: string;
  metadata?: Record<string, unknown>;
  isResolved: boolean;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertFilter {
  hiveId?: string;
  apiaryId?: string;
  organizationId?: string;
  severity?: AlertSeverity;
  isResolved?: boolean;
  alertType?: string;
  page?: number;
  limit?: number;
}

export interface AlertListResponse {
  success: boolean;
  data: Alert[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
