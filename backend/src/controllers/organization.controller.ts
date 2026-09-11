import { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import organizationService from "../services/organization.service.js";
import storageService from "../services/storage.service.js";
import AppError from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class OrganizationController {
  /**
   * POST /api/organizations/apply
   * Public: Submits a new organization onboarding application.
   */
  public apply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await organizationService.submitApplication(req.body);
      return res.status(201).json({
        success: true,
        message:
          "Organization registration application submitted successfully. A HoneyChain Administrator will review your application.",
        data: application,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/organizations/upload-doc
   * Uploads an optional supporting document (e.g., PDF license, certificate).
   * Requires applicationId of a pending application.
   * Accepts JSON { applicationId, fileName, fileData } where fileData is base64-encoded PDF.
   * Validates MIME type and %PDF- magic bytes, and stores file in Cloudinary under
   * HoneyChain/organization-documents/{applicationId}/
   */
  public uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { applicationId, fileName, fileData } = req.body;

      if (!applicationId || typeof applicationId !== "string") {
        return next(new AppError("applicationId is required", 400));
      }
      if (!fileName || typeof fileName !== "string") {
        return next(new AppError("File name is required", 400));
      }
      if (!fileData || typeof fileData !== "string") {
        return next(new AppError("File data (base64 string) is required", 400));
      }

      // Verify application exists and is PENDING before upload
      const existingApp = await organizationService.getApplicationById(applicationId);
      if (existingApp.status !== "PENDING") {
        return next(
          new AppError(
            "Cannot attach documents to an application that has already been processed",
            400
          )
        );
      }

      // Detect and enforce MIME type
      let mimeType = "application/pdf";
      const dataUriMatch = fileData.match(/^data:([^;]+);base64,/i);
      if (dataUriMatch) {
        mimeType = dataUriMatch[1].toLowerCase().trim();
      }

      if (mimeType !== "application/pdf") {
        return next(new AppError("Invalid file type: Only PDF documents are accepted", 400));
      }

      // Strip data URI header if present
      const base64Clean = fileData.replace(/^data:[^;]+;base64,/i, "");
      const buffer = Buffer.from(base64Clean, "base64");

      if (buffer.length === 0) {
        return next(new AppError("Uploaded file is empty", 400));
      }

      // Validate PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
      if (!storageService.isValidPdf(buffer, mimeType)) {
        return next(new AppError("Invalid file type: Only PDF documents are accepted", 400));
      }

      // Max 10MB limit
      if (buffer.length > 10 * 1024 * 1024) {
        return next(new AppError("File size exceeds maximum allowed limit of 10MB", 400));
      }

      // Store in Cloudinary under isolated project path: HoneyChain/organization-documents/{applicationId}/
      const folder = `HoneyChain/organization-documents/${existingApp.applicationId}`;
      const stored = await storageService.storePdf(buffer, fileName, folder, mimeType);

      const docPayload = {
        name: stored.fileName,
        url: stored.url,
        fileType: "application/pdf",
        sizeBytes: stored.sizeBytes,
        uploadedAt: new Date(),
      };

      const result = await organizationService.attachDocument(existingApp.applicationId, docPayload);

      return res.status(201).json({
        success: true,
        message: "Document uploaded and attached successfully",
        document: result.document,
        applicationId: result.application.applicationId,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/organizations/applications
   * Admin only: Lists onboarding applications with optional status filter.
   */
  public getApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, page, limit } = req.query as any;
      const result = await organizationService.listApplications({
        status,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.applications,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/organizations/applications/:id
   * Admin only: Retrieves detailed application by id or applicationId.
   */
  public getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await organizationService.getApplicationById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: application,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/organizations/applications/:id/approve
   * Admin only: Approves application, creates/activates Organization & initial Org Admin.
   */
  public approveApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Authentication required", 401));
      }

      const result = await organizationService.approveApplication(
        req.params.id as string,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: `Organization '${result.organization.name}' approved successfully with blockchain identity assigned`,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/organizations/applications/:id/reject
   * Admin only: Rejects application with a mandatory reason.
   */
  public rejectApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Authentication required", 401));
      }

      const { reason } = req.body;
      const application = await organizationService.rejectApplication(
        req.params.id as string,
        reason,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: "Organization application rejected",
        data: application,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/organizations/my
    * Authenticated: Returns current user's organization profile.
   */
  public getMyOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawOrgId = (req.user?.organizationId as any)?._id || req.user?.organizationId;
      if (!rawOrgId) {
        return next(new AppError("User does not belong to any organization", 404));
      }

      const profile = await organizationService.getOrganizationProfile(rawOrgId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/organizations/my/members
   * Org Admin or HoneyChain Admin: Lists members of caller's organization.
   */
  public getMyMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawOrgId = (req.user?.organizationId as any)?._id || req.user?.organizationId;
      if (!rawOrgId && req.user?.role !== "admin") {
        return next(new AppError("No organization associated with caller", 400));
      }

      const targetOrgId = rawOrgId || (req.query.organizationId as string);
      if (!targetOrgId) {
        return next(new AppError("organizationId is required", 400));
      }

      const members = await organizationService.getOrganizationMembers(targetOrgId);
      return res.status(200).json({
        success: true,
        data: members,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/organizations/my/members
   * Org Admin or HoneyChain Admin: Adds a new member to the organization.
   */
  public addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Authentication required", 401));
      }

      const rawOrgId = ((req.user.organizationId as any)?._id || req.user.organizationId)?.toString();
      const targetOrgId = req.body.organizationId || rawOrgId;
      const member = await organizationService.addMember(req.user, req.body, targetOrgId);

      return res.status(201).json({
        success: true,
        message: "Organization member created successfully",
        data: member,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * PATCH /api/organizations/my/members/:userId/status
   * Org Admin or HoneyChain Admin: Updates member active status (activate/deactivate).
   */
  public updateMemberStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Authentication required", 401));
      }

      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return next(new AppError("'isActive' boolean is required in request body", 400));
      }

      const updatedMember = await organizationService.updateMemberStatus(
        req.user,
        req.params.userId as string,
        isActive
      );

      return res.status(200).json({
        success: true,
        message: `Member ${isActive ? "activated" : "deactivated"} successfully`,
        data: updatedMember,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/organizations
   * System Admin only: Lists all organizations in HoneyChain.
   */
  public getAllOrganizations = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const orgs = await organizationService.getAllOrganizations();
      return res.status(200).json({
        success: true,
        data: orgs,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * PATCH /api/organizations/:id/status
   * System Admin only: Suspends or activates an organization.
   */
  public updateOrganizationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      if (status !== "active" && status !== "suspended") {
        return next(new AppError("Status must be either 'active' or 'suspended'", 400));
      }

      const org = await organizationService.updateOrganizationStatus(
        req.params.id as string,
        status
      );

      return res.status(200).json({
        success: true,
        message: `Organization '${org.name}' status updated to ${status}`,
        data: org,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const organizationController = new OrganizationController();
export default organizationController;
