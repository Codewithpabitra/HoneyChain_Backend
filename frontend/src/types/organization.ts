// src/types/organization.ts
import type { Role } from "./auth";

export type OrganizationType =
  | "beekeeper"
  | "processor"
  | "lab"
  | "distributor"
  | "transporter"
  | "auditor";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApplicationDocument {
  name: string;
  url: string;
  fileType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface ProposedMember {
  name: string;
  email: string;
  role?: OrganizationType;
}

export interface OrganizationApplication {
  _id: string;
  applicationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  role?: OrganizationType;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  adminName: string;
  adminEmail: string;
  documents: ApplicationDocument[];
  status: ApplicationStatus;
  rejectionReason?: string;
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  rejectedAt?: string;
  organizationId?: {
    _id: string;
    name: string;
    walletAddress: string;
    status: string;
    organizationType: string;
  };
  metadata?: {
    proposedMembers?: ProposedMember[];
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  isOrgAdmin: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationDetails {
  _id: string;
  name: string;
  role: OrganizationType;
  organizationType: OrganizationType;
  walletAddress: string;
  status: "active" | "suspended";
  isActive: boolean;
  adminUserId?: {
    _id: string;
    name: string;
    email: string;
  };
  metadata?: {
    registrationNumber?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
}

export interface OrganizationProfileResponse {
  organization: OrganizationDetails;
  members: OrganizationMember[];
}

export interface SubmitApplicationDTO {
  organizationName: string;
  organizationType: OrganizationType;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  adminName: string;
  adminEmail: string;
  documents?: ApplicationDocument[];
  metadata?: {
    proposedMembers?: ProposedMember[];
    [key: string]: unknown;
  };
}

export interface AddMemberDTO {
  name: string;
  email: string;
  password: string;
  role?: Role;
  isOrgAdmin?: boolean;
}

export interface ApplicationListResponse {
  success: boolean;
  data: OrganizationApplication[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApplicationApprovalResponse {
  success: boolean;
  message: string;
  data: {
    application: OrganizationApplication;
    organization: OrganizationDetails;
    adminUser: {
      _id: string;
      name: string;
      email: string;
      role: OrganizationType;
      isOrgAdmin: boolean;
      isActive: boolean;
    };
    activationToken: string;
    activation: {
      activationToken: string;
      expiresAt: string;
      activationUrl: string;
    };
  };
}
