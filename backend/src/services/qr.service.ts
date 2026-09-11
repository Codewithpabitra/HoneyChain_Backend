import QRCode from "qrcode";
import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";

export interface QrCodeResult {
  verificationUrl: string;
  dataUrl: string;
  svg: string;
}

export class QrService {
  /**
   * Resolves and normalizes the public base URL for consumer verification.
   * Fails with a clear, actionable error if PUBLIC_BASE_URL is missing.
   */
  public getPublicBaseUrl(overrideUrl?: string): string {
    const rawUrl =
      overrideUrl?.trim() ||
      env.PUBLIC_BASE_URL?.trim() ||
      process.env.PUBLIC_BASE_URL?.trim();

    if (!rawUrl) {
      throw new AppError(
        "PUBLIC_BASE_URL is not configured. Please configure PUBLIC_BASE_URL in your environment variables (e.g. 'https://honeychain-backend-trag.onrender.com' in production or 'http://localhost:5000' in local development) to generate consumer verification QR codes.",
        500
      );
    }

    // Strip any trailing slashes for consistent URL formatting
    return rawUrl.replace(/\/+$/, "");
  }

  /**
   * Constructs the public consumer verification URL for a given batch.
   * e.g. https://honeychain-backend-trag.onrender.com/verify/HC-BATCH-2026-001
   */
  public generateVerificationUrl(batchId: string, baseUrl?: string): string {
    if (!batchId || typeof batchId !== "string" || !batchId.trim()) {
      throw new AppError("Invalid batchId: A non-empty batch ID is required", 400);
    }

    const base = this.getPublicBaseUrl(baseUrl);
    return `${base}/verify/${encodeURIComponent(batchId.trim())}`;
  }

  /**
   * Generates high-resolution PNG Data URL and SVG vector markup encoding the verification URL.
   */
  public async generateQrCode(
    batchId: string,
    baseUrl?: string,
    options?: QRCode.QRCodeToDataURLOptions
  ): Promise<QrCodeResult> {
    const verificationUrl = this.generateVerificationUrl(batchId, baseUrl);

    // Generate high-density PNG base64 Data URL (Error correction H allows up to 30% damage/distortion)
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "H",
      width: 400,
      margin: 2,
      color: {
        dark: "#0F172A", // Slate dark matching HoneyChain theme
        light: "#FFFFFF",
      },
      ...options,
    });

    // Generate vector SVG string for lossless printing
    const svg = await QRCode.toString(verificationUrl, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 2,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    return {
      verificationUrl,
      dataUrl,
      svg,
    };
  }
}

export const qrService = new QrService();
export default qrService;
