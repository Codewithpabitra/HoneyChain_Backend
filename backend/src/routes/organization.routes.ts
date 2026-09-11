import { Router } from "express";
import { organizationController } from "../controllers/organization.controller.js";
import { authenticate, authorize, requireOrgAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// ============================================================================
// 1. Public Onboarding Application Routes
// ============================================================================
// Public: Submit organization registration application (starts as PENDING)
router.post("/apply", organizationController.apply);

// Public / Supporting: Upload supporting PDF document (returns document URL/metadata)
router.post("/upload-doc", organizationController.uploadDocument);

// ============================================================================
// 2. HoneyChain Admin: Application Governance & Review Routes
// ============================================================================
// Admin: View pending/filtered applications
router.get(
  "/applications",
  authenticate,
  authorize("admin"),
  organizationController.getApplications
);

// Admin: Inspect specific application details
router.get(
  "/applications/:id",
  authenticate,
  authorize("admin"),
  organizationController.getApplicationById
);

// Admin: Approve application (creates/activates Org & Org Admin, assigns wallet)
router.post(
  "/applications/:id/approve",
  authenticate,
  authorize("admin"),
  organizationController.approveApplication
);

// Admin: Reject application with reason
router.post(
  "/applications/:id/reject",
  authenticate,
  authorize("admin"),
  organizationController.rejectApplication
);

// ============================================================================
// 3. Organization Profile & Member Management Routes (Tenant Isolated)
// ============================================================================
// Authenticated: View current user's organization profile & wallet address
router.get("/my", authenticate, organizationController.getMyOrganization);

// Org Admin / System Admin: View members of organization
router.get(
  "/my/members",
  authenticate,
  requireOrgAdmin,
  organizationController.getMyMembers
);

// Org Admin / System Admin: Add member to own organization
router.post(
  "/my/members",
  authenticate,
  requireOrgAdmin,
  organizationController.addMember
);

// Org Admin / System Admin: Update member active status (activate/deactivate)
router.patch(
  "/my/members/:userId/status",
  authenticate,
  requireOrgAdmin,
  organizationController.updateMemberStatus
);

// ============================================================================
// 4. HoneyChain Admin: System-Wide Organization Administration
// ============================================================================
// Admin: List all organizations
router.get(
  "/",
  authenticate,
  authorize("admin"),
  organizationController.getAllOrganizations
);

// Admin: Suspend or activate an organization
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  organizationController.updateOrganizationStatus
);

export default router;
