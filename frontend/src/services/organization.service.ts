// src/services/organization.service.ts
import api from "@/lib/axios";
import type {
  SubmitApplicationDTO,
  OrganizationApplication,
  ApplicationListResponse,
  ApplicationApprovalResponse,
  OrganizationProfileResponse,
  OrganizationMember,
  AddMemberDTO,
  ApplicationStatus,
} from "@/types/organization";

export class OrganizationService {
  /**
   * POST /api/organizations/apply
   * Public: Submits an application for organization onboarding.
   */
  async apply(data: SubmitApplicationDTO): Promise<{
    success: boolean;
    message: string;
    data: OrganizationApplication;
  }> {
    const response = await api.post("/api/organizations/apply", data);
    return response.data;
  }

  /**
   * POST /api/organizations/upload-doc
   * Public: Uploads a supporting PDF document attached to a pending application.
   */
  async uploadDocument(
    applicationId: string,
    file: File
  ): Promise<{
    success: boolean;
    message: string;
    document: {
      name: string;
      url: string;
      fileType: string;
      sizeBytes: number;
    };
  }> {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

    const response = await api.post("/api/organizations/upload-doc", {
      applicationId,
      fileName: file.name,
      fileData: base64Data,
    });
    return response.data;
  }

  /**
   * GET /api/organizations/applications
   * Admin only: Lists submitted onboarding applications.
   */
  async getApplications(params?: {
    status?: ApplicationStatus;
    page?: number;
    limit?: number;
  }): Promise<ApplicationListResponse> {
    const response = await api.get("/api/organizations/applications", {
      params,
    });
    return response.data;
  }

  /**
   * GET /api/organizations/applications/:id
   * Admin only: Retrieves a specific application by ID or application ID.
   */
  async getApplicationById(id: string): Promise<{
    success: boolean;
    data: OrganizationApplication;
  }> {
    const response = await api.get(`/api/organizations/applications/${id}`);
    return response.data;
  }

  /**
   * POST /api/organizations/applications/:id/approve
   * Admin only: Approves an organization application, assigning blockchain identity.
   */
  async approveApplication(id: string): Promise<ApplicationApprovalResponse> {
    const response = await api.post(
      `/api/organizations/applications/${id}/approve`
    );
    return response.data;
  }

  /**
   * POST /api/organizations/applications/:id/reject
   * Admin only: Rejects an application with a mandatory reason.
   */
  async rejectApplication(
    id: string,
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
    data: OrganizationApplication;
  }> {
    const response = await api.post(
      `/api/organizations/applications/${id}/reject`,
      { reason }
    );
    return response.data;
  }

  /**
   * GET /api/organizations/my
   * Authenticated: Retrieves the current caller's organization details.
   */
  async getMyOrganization(): Promise<{
    success: boolean;
    data: OrganizationProfileResponse;
  }> {
    const response = await api.get("/api/organizations/my");
    return response.data;
  }

  /**
   * GET /api/organizations/my/members
   * Org Admin / Admin: Lists all members belonging to caller's organization.
   */
  async getMyMembers(organizationId?: string): Promise<{
    success: boolean;
    data: OrganizationMember[];
  }> {
    const response = await api.get("/api/organizations/my/members", {
      params: organizationId ? { organizationId } : undefined,
    });
    return response.data;
  }

  /**
   * POST /api/organizations/my/members
   * Org Admin / Admin: Adds a member to caller's organization.
   */
  async addMember(
    memberData: AddMemberDTO,
    organizationId?: string
  ): Promise<{
    success: boolean;
    message: string;
    data: OrganizationMember;
  }> {
    const response = await api.post("/api/organizations/my/members", {
      ...memberData,
      ...(organizationId ? { organizationId } : {}),
    });
    return response.data;
  }

  /**
   * PATCH /api/organizations/my/members/:userId/status
   * Org Admin / Admin: Activates or deactivates an organization member.
   */
  async updateMemberStatus(
    userId: string,
    isActive: boolean
  ): Promise<{
    success: boolean;
    message: string;
    data: OrganizationMember;
  }> {
    const response = await api.patch(
      `/api/organizations/my/members/${userId}/status`,
      { isActive }
    );
    return response.data;
  }

  /**
   * POST /api/auth/activate
   * Public: Activates an approved organization administrator account and sets password.
   */
  async activateAccount(
    token: string,
    password: string
  ): Promise<{
    success: boolean;
    message: string;
    token: string;
    user: Record<string, unknown>;
  }> {
    const response = await api.post("/api/auth/activate", { token, password });
    return response.data;
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
