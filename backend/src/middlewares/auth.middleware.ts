import { Request, Response, NextFunction } from "express";
import { User, IUser } from "../models/User.js";
import authService from "../services/auth.service.js";
import AppError from "../utils/AppError.js";

// Extend Express Request interface to include authenticated user details
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Normalizes role aliases to canonical names for comparison.
 */
function normalizeRole(role: string): string {
  const r = role.toLowerCase().trim();
  if (r === "laboratory") return "lab";
  if (r === "distributor") return "transporter";
  return r;
}

/**
 * Middleware: Verifies JWT Bearer token and attaches authenticated user.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1]?.trim();
    }

    // 2. Fallback to cookies if present
    if (!token && req.cookies && (req.cookies.token || req.cookies.jwt)) {
      token = req.cookies.token || req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError(
          "Authentication required. Please provide a valid Bearer token in Authorization header",
          401
        )
      );
    }

    // 3. Verify token
    const decoded = authService.verifyToken(token);

    // 4. Load user from database
    const user = await User.findById(decoded.sub).populate("organizationId");
    if (!user) {
      return next(
        new AppError(
          "User account belonging to this token no longer exists",
          401
        )
      );
    }

    if (!user.isActive) {
      return next(
        new AppError(
          "User account has been deactivated. Please contact your administrator",
          401
        )
      );
    }

    // 5. Attach user context to request
    req.user = user;
    req.userId = user._id.toString();
    req.userRole = user.role;

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Role-based access control.
 * Rejects with 403 Forbidden if user's role does not match allowed roles.
 * Admin users are automatically authorized for all roles.
 */
export const authorize = (...allowedRoles: string[]) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required before authorization check", 401)
      );
    }

    const userRole = normalizeRole(req.user.role);

    // Admin has superuser authorization for all operations
    if (userRole === "admin") {
      return next();
    }

    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    return next(
      new AppError(
        `Access forbidden: User role '${req.user.role}' is not authorized to perform this action. Required role: ${allowedRoles.join(" or ")}`,
        403
      )
    );
  };
};

export default { authenticate, authorize };
