import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { IUser } from "../models/User.js";
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
}

export const authService = new AuthService();
export default authService;
