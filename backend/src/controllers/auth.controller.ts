import { Request, Response, NextFunction } from "express";
import { User, IUser, UserRole } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import authService from "../services/auth.service.js";
import blockchainService from "../services/blockchain.service.js";
import AppError from "../utils/AppError.js";

const VALID_ROLES: UserRole[] = [
  "admin",
  "beekeeper",
  "processor",
  "lab",
  "transporter",
  "auditor",
];

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates user with email and password, returning a JWT token.
   */
  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== "string" || !email.trim()) {
        return next(new AppError("Email is required", 400));
      }
      if (!password || typeof password !== "string") {
        return next(new AppError("Password is required", 400));
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find user including passwordHash
      const user = await User.findOne({ email: normalizedEmail })
        .select("+passwordHash")
        .populate("organizationId");

      if (!user) {
        return next(new AppError("Invalid email or password", 401));
      }

      if (!user.isActive) {
        return next(
          new AppError(
            "Account has been deactivated. Please contact your administrator",
            401
          )
        );
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return next(new AppError("Invalid email or password", 401));
      }

      // Issue JWT
      const token = authService.generateToken(user);

      // Resolve stakeholder blockchain wallet address for the user's role
      let walletAddress: string | undefined;
      try {
        walletAddress = blockchainService.getWalletAddressForRole(user.role);
      } catch {
        // Safe fallback if role key is not configured locally
        walletAddress = undefined;
      }

      // Set cookie for browser clients
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organizationId,
          walletAddress,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/auth/me
   * Returns current authenticated user profile and associated stakeholder wallet.
   */
  public getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authenticated", 401));
      }

      let walletAddress: string | undefined;
      try {
        walletAddress = blockchainService.getWalletAddressForRole(req.user.role);
      } catch {
        walletAddress = undefined;
      }

      return res.status(200).json({
        success: true,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          organization: req.user.organizationId,
          walletAddress,
          createdAt: req.user.createdAt,
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/auth/logout
   * Clears authentication cookie.
   */
  public logout = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie("token");
      res.clearCookie("jwt");
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/auth/users
   * Admin-only endpoint to provision application users with designated roles.
   */
  public createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role, organizationId } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return next(new AppError("User 'name' is required", 400));
      }
      if (!email || typeof email !== "string" || !email.trim()) {
        return next(new AppError("User 'email' is required", 400));
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return next(new AppError("Password must be at least 6 characters long", 400));
      }
      if (!role || !VALID_ROLES.includes(role)) {
        return next(
          new AppError(
            `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
            400
          )
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return next(new AppError(`User with email '${normalizedEmail}' already exists`, 409));
      }

      // If organizationId provided, verify existence
      if (organizationId) {
        const org = await Organization.findById(organizationId);
        if (!org) {
          return next(new AppError("Specified organization does not exist", 404));
        }
      }

      const passwordHash = await authService.hashPassword(password);

      const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        ...(organizationId && { organizationId }),
        isActive: true,
      });

      await newUser.save();

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser.toJSON(),
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/auth/wallets
   * Informational route returning the 5 public blockchain stakeholder wallet addresses.
   */
  public getStakeholderWallets = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const wallets = blockchainService.getStakeholderWallets();
      return res.status(200).json({
        success: true,
        wallets,
      });
    } catch (err) {
      return next(err);
    }
  };
}

export const authController = new AuthController();
export default authController;
