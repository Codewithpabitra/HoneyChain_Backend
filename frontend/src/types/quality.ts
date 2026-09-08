import type { QualityGrade } from "@/types/batch";

export interface CreateQualityPayload {
  grade: QualityGrade;
  moisturePercentage: number;
  labReportData?: Record<string, number | string>;
  labReportHash?: string;
}

export interface QualityTest {
  grade: QualityGrade;
  moisturePercentage: number;
  certifiedBy: string;
  certificationTimestamp: number;
  labReportHash: string;
  labReportData?: Record<string, number | string>;
}