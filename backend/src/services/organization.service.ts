import mongoose, { Types } from "mongoose";
import crypto from "node:crypto";
import {
  Organization,
  IOrganization,
  OrganizationRole,
  OrganizationType,
} from "../models/Organization.js";
import {
  OrganizationApplication,
  IOrganizationApplication,
  IApplicationDocument,
  ApplicationStatus,
} from "../models/OrganizationApplication.js";
import { User, IUser, UserRole } from "../models/User.js";
import authService from "./auth.service.js";
import blockchainService from "./blockchain.service.js";
import AppError from "../utils/AppError.js";

const VALID_PUBLIC_ROLES: OrganizationType[] = [
  "beekeeper",
  "processor",
  "lab",
  "transporter",
  "auditor",
];

export interface SubmitApplicationDTO {
  organizationName: string;
  organizationType?: OrganizationType;
  role?: OrganizationRole;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  adminName: string;
  adminEmail: string;
  documents?: IApplicationDocument[];
  metadata?: Record<string, any>;
}

export interface AddMemberDTO {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isOrgAdmin?: boolean;
}

export class OrganizationService {
  /**
   * Public: Submits an application to register a new organization.
   * Starts in PENDING state awaiting HoneyChain Admin review.
   * Does NOT collect or store passwords at the application stage.
   */
  public async submitApplication(data: SubmitApplicationDTO): Promise<IOrganizationApplication> {
    const {
      organizationName,
      organizationType,
      role,
      registrationNumber,
      contactEmail,
      contactPhone,
      address,
      adminName,
      adminEmail,
      documents = [],
      metadata = {},
    } = data;

    const targetType = (organizationType || role) as OrganizationType;

    // 1. Validate required fields
    if (!organizationName || typeof organizationName !== "string" || !organizationName.trim()) {
      throw new AppError("Organization name is required", 400);
    }
    if (!targetType || !VALID_PUBLIC_ROLES.includes(targetType)) {
      throw new AppError(
        `Invalid organization type. Allowed types for application: ${VALID_PUBLIC_ROLES.join(", ")}`,
        400
      );
    }
    if (!contactEmail || typeof contactEmail !== "string" || !contactEmail.trim()) {
      throw new AppError("Contact email is required", 400);
    }
    if (!adminName || typeof adminName !== "string" || !adminName.trim()) {
      throw new AppError("Initial Organization Admin name is required", 400);
    }
    if (!adminEmail || typeof adminEmail !== "string" || !adminEmail.trim()) {
      throw new AppError("Initial Organization Admin email is required", 400);
    }

    const normalizedAdminEmail = adminEmail.toLowerCase().trim();
    const normalizedContactEmail = contactEmail.toLowerCase().trim();
    const trimmedOrgName = organizationName.trim();

    // 2. Check if a user with adminEmail already exists
    const existingUser = await User.findOne({ email: normalizedAdminEmail });
    if (existingUser) {
      throw new AppError(
        `A user account with email '${normalizedAdminEmail}' already exists`,
        409
      );
    }

    // 3. Check if an organization with the same name already exists
    const existingOrg = await Organization.findOne({
      name: { $regex: new RegExp(`^${trimmedOrgName}$`, "i") },
    });
    if (existingOrg) {
      throw new AppError(
        `An organization with the name '${trimmedOrgName}' already exists`,
        409
      );
    }

    // 4. Check if there is already a PENDING application for this admin email or org name
    const existingPending = await OrganizationApplication.findOne({
      status: "PENDING",
      $or: [
        { adminEmail: normalizedAdminEmail },
        { organizationName: { $regex: new RegExp(`^${trimmedOrgName}$`, "i") } },
      ],
    });
    if (existingPending) {
      throw new AppError(
        "A pending application for this organization name or admin email is already awaiting review",
        409
      );
    }

    // 5. Generate unique application ID
    const applicationId = `APP-ORG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const application = new OrganizationApplication({
      applicationId,
      organizationName: trimmedOrgName,
      organizationType: targetType,
      role: targetType,
      registrationNumber: registrationNumber?.trim(),
      contactEmail: normalizedContactEmail,
      contactPhone: contactPhone?.trim(),
      address: address?.trim(),
      adminName: adminName.trim(),
      adminEmail: normalizedAdminEmail,
      documents,
      status: "PENDING",
      metadata,
    });

    await application.save();
    return application;
  }

  /**
   * HoneyChain Admin: Lists applications with optional status filter.
   */
  public async listApplications(params: {
    status?: ApplicationStatus;
    page?: number;
    limit?: number;
  }): Promise<{ applications: IOrganizationApplication[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (params.status) {
      query.status = params.status;
    }

    const [applications, total] = await Promise.all([
      OrganizationApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("approvedBy", "name email")
        .populate("rejectedBy", "name email")
        .populate("organizationId", "name walletAddress status organizationType"),
      OrganizationApplication.countDocuments(query),
    ]);

    return { applications, total, page, limit };
  }

  /**
   * HoneyChain Admin: Retrieves application details by MongoDB _id or applicationId.
   */
  public async getApplicationById(idOrAppId: string): Promise<IOrganizationApplication> {
    const query = mongoose.isValidObjectId(idOrAppId)
      ? { $or: [{ _id: idOrAppId }, { applicationId: idOrAppId }] }
      : { applicationId: idOrAppId };

    const application = await OrganizationApplication.findOne(query)
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("organizationId");

    if (!application) {
      throw new AppError("Organization application not found", 404);
    }
    return application;
  }

  /**
   * HoneyChain Admin: Approves an organization application.
   * 1. Generates a UNIQUE blockchain identity for the organization (never a shared role wallet).
   * 2. Creates & activates Organization with organizationType and unique wallet.
   * 3. Provisions Organization Admin with a secure activation token (inactive until password is set).
   * 4. Marks application APPROVED, records approvedBy and approvedAt.
   */
  public async approveApplication(
    idOrAppId: string,
    adminUser: IUser
  ): Promise<{
    application: IOrganizationApplication;
    organization: IOrganization;
    adminUser: Record<string, any>;
    activationToken: string;
    activation: {
      activationToken: string;
      expiresAt: Date;
      activationUrl: string;
    };
  }> {
    const application = await this.getApplicationById(idOrAppId);

    if (application.status !== "PENDING") {
      throw new AppError(
        `Application cannot be approved because it has already been processed with status: ${application.status}`,
        400
      );
    }

    // 1. Generate a UNIQUE blockchain wallet identity for this specific organization
    const uniqueWallet = blockchainService.createUniqueOrganizationWallet();
    const orgType = (application.organizationType || application.role) as OrganizationType;

    // 2. Create and activate Organization
    const organization = new Organization({
      name: application.organizationName,
      role: orgType,
      organizationType: orgType,
      walletAddress: uniqueWallet.address.toLowerCase(),
      encryptedPrivateKey: uniqueWallet.encryptedPrivateKey,
      isActive: true,
      status: "active",
      applicationId: application._id,
      approvedBy: adminUser._id,
      approvedAt: new Date(),
      metadata: {
        registrationNumber: application.registrationNumber,
        contactEmail: application.contactEmail,
        contactPhone: application.contactPhone,
        address: application.address,
      },
    });

    await organization.save();

    // 3. Provision Organization Admin user with secure activation token (password setup flow)
    const activationToken = crypto.randomBytes(32).toString("hex");
    const activationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const initialOrgAdmin = new User({
      name: application.adminName,
      email: application.adminEmail.toLowerCase(),
      role: orgType as UserRole,
      organizationId: organization._id,
      isOrgAdmin: true,
      isActive: false, // Inactive until password is set through activation
      activationToken,
      activationExpires,
    });

    await initialOrgAdmin.save();

    // Link admin user back to organization
    organization.adminUserId = initialOrgAdmin._id;
    await organization.save();

    // 4. Update application to APPROVED
    application.status = "APPROVED";
    application.approvedBy = adminUser._id;
    application.approvedAt = new Date();
    application.organizationId = organization._id;
    await application.save();

    return {
      application: application.toJSON() as any,
      organization,
      adminUser: initialOrgAdmin.toJSON(),
      activationToken,
      activation: {
        activationToken,
        expiresAt: activationExpires,
        activationUrl: `/auth/activate?token=${activationToken}`,
      },
    };
  }

  /**
   * Attaches an uploaded supporting document to an existing pending application.
   */
  public async attachDocument(
    applicationId: string,
    document: IApplicationDocument
  ): Promise<{ application: IOrganizationApplication; document: IApplicationDocument }> {
    const query = mongoose.isValidObjectId(applicationId)
      ? { $or: [{ _id: applicationId }, { applicationId }] }
      : { applicationId };

    const application = await OrganizationApplication.findOne(query);
    if (!application) {
      throw new AppError("Organization application not found", 404);
    }

    if (application.status !== "PENDING") {
      throw new AppError(
        "Cannot attach documents to an application that has already been processed",
        400
      );
    }

    application.documents.push(document);
    await application.save();

    return { application, document };
  }

  /**
   * HoneyChain Admin: Rejects an organization application with a mandatory reason.
   */
  public async rejectApplication(
    idOrAppId: string,
    reason: string,
    adminUser: IUser
  ): Promise<IOrganizationApplication> {
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw new AppError("A rejection reason is required", 400);
    }

    const application = await this.getApplicationById(idOrAppId);

    if (application.status !== "PENDING") {
      throw new AppError(
        `Application cannot be rejected because it has already been processed with status: ${application.status}`,
        400
      );
    }

    application.status = "REJECTED";
    application.rejectionReason = reason.trim();
    application.rejectedBy = adminUser._id;
    application.rejectedAt = new Date();
    await application.save();

    return application;
  }

  /**
   * Organization Admin / HoneyChain Admin: Adds a new member to an organization.
   * Strictly enforces organization isolation: Organization Admins can only add members to their own org.
   */
  public async addMember(
    requesterUser: IUser,
    memberData: AddMemberDTO,
    targetOrgId?: string
  ): Promise<IUser> {
    const { name, email, password, role, isOrgAdmin = false } = memberData;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError("Member name is required", 400);
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      throw new AppError("Member email is required", 400);
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      throw new AppError("Password must be at least 6 characters long", 400);
    }

    // Determine target organization ID
    let resolvedOrgId: Types.ObjectId;
    if (requesterUser.role === "admin") {
      // Platform admin can specify target org
      if (!targetOrgId) {
        throw new AppError("Platform admin must specify target organizationId", 400);
      }
      resolvedOrgId = new Types.ObjectId(targetOrgId);
    } else {
      // Organization admin can ONLY add to their own organization
      if (!requesterUser.isOrgAdmin) {
        throw new AppError("Only Organization Admins can manage members", 403);
      }
      if (!requesterUser.organizationId) {
        throw new AppError("Requester does not belong to any organization", 400);
      }
      const rawOrgId = (requesterUser.organizationId as any)?._id || requesterUser.organizationId;
      resolvedOrgId = new Types.ObjectId(rawOrgId);
    }

    // Verify target organization is active
    const targetOrg = await Organization.findById(resolvedOrgId);
    if (!targetOrg) {
      throw new AppError("Organization not found", 404);
    }
    if (!targetOrg.isActive || targetOrg.status !== "active") {
      throw new AppError("Cannot add members to an inactive or suspended organization", 403);
    }

    // Role enforcement: Org Admins cannot create HoneyChain Admins
    if (requesterUser.role !== "admin") {
      if (role === "admin") {
        throw new AppError("Organization Admins cannot create HoneyChain Platform Admins", 403);
      }
    }

    // Default member role to organization role if not provided or invalid
    const assignedRole: UserRole =
      requesterUser.role === "admin" && role
        ? (role as UserRole)
        : (targetOrg.role as UserRole);

    const normalizedEmail = email.toLowerCase().trim();

    // Check uniqueness
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError(`User with email '${normalizedEmail}' already exists`, 409);
    }

    const passwordHash = await authService.hashPassword(password);

    const newMember = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      organizationId: resolvedOrgId,
      isOrgAdmin: Boolean(isOrgAdmin),
      isActive: true,
    });

    await newMember.save();
    return newMember;
  }

  /**
   * Retrieves all members belonging to an organization.
   */
  public async getOrganizationMembers(organizationId: Types.ObjectId | string): Promise<IUser[]> {
    const orgId = (organizationId as any)?._id || organizationId;
    return User.find({ organizationId: orgId }).sort({ createdAt: 1 });
  }

  /**
   * Updates member active status within an organization.
   * Org Admin can only update members of their own organization.
   */
  public async updateMemberStatus(
    requesterUser: IUser,
    memberUserId: string,
    isActive: boolean
  ): Promise<IUser> {
    const member = await User.findById(memberUserId);
    if (!member) {
      throw new AppError("Member user not found", 404);
    }

    // Organization isolation
    if (requesterUser.role !== "admin") {
      if (!requesterUser.isOrgAdmin) {
        throw new AppError("Only Organization Admins can manage member status", 403);
      }

      const reqOrgId = ((requesterUser.organizationId as any)?._id || requesterUser.organizationId)?.toString();
      const memOrgId = ((member.organizationId as any)?._id || member.organizationId)?.toString();

      if (!reqOrgId || !memOrgId || reqOrgId !== memOrgId) {
        throw new AppError("Cannot modify members outside your organization", 403);
      }
      if (requesterUser._id.equals(member._id)) {
        throw new AppError("Organization Admins cannot deactivate their own account", 400);
      }
    }

    member.isActive = isActive;
    await member.save();
    return member;
  }

  /**
   * System Admin: Suspends or activates an organization.
   */
  public async updateOrganizationStatus(
    organizationId: string,
    status: "active" | "suspended"
  ): Promise<IOrganization> {
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new AppError("Organization not found", 404);
    }

    org.status = status;
    org.isActive = status === "active";
    await org.save();
    return org;
  }

  /**
   * System Admin: Lists all registered organizations.
   */
  public async getAllOrganizations(): Promise<IOrganization[]> {
    return Organization.find().sort({ createdAt: -1 }).populate("adminUserId", "name email");
  }

  /**
   * Gets organization profile with members and assigned wallet.
   */
  public async getOrganizationProfile(organizationId: Types.ObjectId | string): Promise<{
    organization: IOrganization;
    members: IUser[];
  }> {
    const org = await Organization.findById(organizationId).populate("adminUserId", "name email");
    if (!org) {
      throw new AppError("Organization not found", 404);
    }
    const members = await this.getOrganizationMembers(organizationId);
    return { organization: org, members };
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
