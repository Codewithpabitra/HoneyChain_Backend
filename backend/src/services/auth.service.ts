import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { User, IUser } from "../models/User.js";
import AppError from "../utils/AppError.js";

export interface TokenPayload {
  sub: string;
  role: string;
  organizationId?: string;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = env.JWT_SECRET;
    this.jwtExpiresIn = env.JWT_EXPIRES_IN;
  }

  /**
   * Generates a signed JWT for an authenticated user.
   */
  public generateToken(user: IUser): string {
    const payload: TokenPayload = {
      sub: user._id.toString(),
      role: user.role,
      ...(user.organizationId && { organizationId: user.organizationId.toString() }),
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as any,
    });
  }

  /**
   * Verifies and decodes a JWT token.
   */
  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      if (!decoded.sub || !decoded.role) {
        throw new AppError("Invalid token payload", 401);
      }
      return decoded;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Authentication token has expired. Please log in again", 401);
      }
      throw new AppError("Invalid authentication token", 401);
    }
  }

  /**
   * Hashes a plaintext password using bcrypt with salt rounds = 10.
   */
  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares candidate password against bcrypt hash.
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Activates a newly approved organization admin account using a secure activation token.
   * Sets initial password and returns a session token.
   */
  public async activateAccount(
    token: string,
    newPassword: string
  ): Promise<{ user: IUser; authToken: string }> {
    if (!token || typeof token !== "string" || !token.trim()) {
      throw new AppError("Activation token is required", 400);
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters long", 400);
    }

    const user = await User.findOne({
      activationToken: token.trim(),
      activationExpires: { $gt: new Date() },
    }).select("+activationToken +activationExpires +passwordHash");

    if (!user) {
      throw new AppError("Invalid or expired activation token", 400);
    }

    const passwordHash = await this.hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.isActive = true;
    user.activationToken = undefined;
    user.activationExpires = undefined;
    await user.save();

    const authToken = this.generateToken(user);
    return { user, authToken };
  }
}

export const authService = new AuthService();
export default authService;

