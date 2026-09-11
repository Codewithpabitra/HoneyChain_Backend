import { Request, Response, NextFunction } from "express";
import alertService from "../services/alert.service.js";
import AppError from "../utils/AppError.js";

export class AlertController {
  /**
   * GET /api/alerts
   * Retrieves alerts with optional filters, pagination, and tenant isolation.
   */
  public getAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        hiveId,
        apiaryId,
        organizationId,
        severity,
        isResolved,
        alertType,
        page,
        limit,
      } = req.query as any;

      const isAdmin = req.user?.role === "admin" || req.user?.role === "auditor";
      const userOrgId = (req.user?.organizationId as any)?._id?.toString() || req.user?.organizationId?.toString();

      let parsedIsResolved: boolean | undefined;
      if (isResolved === "true") parsedIsResolved = true;
      if (isResolved === "false") parsedIsResolved = false;

      const result = await alertService.getAlerts(
        {
          hiveId,
          apiaryId,
          organizationId,
          severity,
          isResolved: parsedIsResolved,
          alertType,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
        userOrgId,
        isAdmin
      );

      return res.status(200).json({
        success: true,
        data: result.alerts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * PATCH /api/alerts/:id/resolve
   * Resolves an alert.
   */
  public resolveAlert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Authentication required", 401));
      }

      const alertId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const isAdmin = req.user.role === "admin" || req.user.role === "auditor";
      const userOrgId = (req.user.organizationId as any)?._id?.toString() || req.user.organizationId?.toString();

      const resolved = await alertService.resolveAlert(
        alertId,
        req.user._id,
        userOrgId,
        isAdmin
      );

      return res.status(200).json({
        success: true,
        message: "Alert resolved successfully",
        data: resolved,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const alertController = new AlertController();
export default alertController;
