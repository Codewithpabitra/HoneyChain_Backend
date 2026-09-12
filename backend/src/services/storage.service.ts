import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import AppError from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

export interface StoredFileResult {
  url: string;
  sha256Hash: string;
  sizeBytes: number;
  fileName: string;
}

export class StorageService {
  private uploadsDir: string;

  constructor(customUploadsDir?: string) {
    this.uploadsDir = customUploadsDir || BASE_UPLOADS_DIR;
    this.ensureDirectory(this.uploadsDir);
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Validates if buffer starts with PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D).
   * Also optionally validates MIME type matches application/pdf.
   */
  public isValidPdf(buffer: Buffer, mimeType?: string): boolean {
    if (mimeType && mimeType.toLowerCase().trim() !== "application/pdf") {
      return false;
    }
    if (!buffer || buffer.length < 5) return false;
    return (
      buffer[0] === 0x25 && // %
      buffer[1] === 0x50 && // P
      buffer[2] === 0x44 && // D
      buffer[3] === 0x46 && // F
      buffer[4] === 0x2d    // -
    );
  }

  /**
   * Computes deterministic SHA-256 digest of file buffer (0x-prefixed for EVM compatibility).
   */
  public computeSha256(buffer: Buffer): string {
    const digest = crypto.createHash("sha256").update(buffer).digest("hex");
    return `0x${digest}`;
  }

  /**
   * Normalizes folder path to ensure strict isolation under HoneyChain root folder.
   * Prevents accidental writes or overwrites to external assets in shared Cloudinary accounts.
   */
  public normalizeFolderPath(folder: string): string {
    const cleaned = folder.replace(/^\/+|\/+$/g, "");
    if (cleaned.startsWith("HoneyChain")) {
      return cleaned;
    }
    return `HoneyChain/${cleaned}`;
  }

  /**
   * Stores a PDF document using Cloudinary (under HoneyChain/...) or fallback local storage.
   * Enforces that PDFs are NOT stored on the backend filesystem in production.
   */
  public async storePdf(
    buffer: Buffer,
    originalName: string,
    folder: string = "certificates",
    mimeType: string = "application/pdf"
  ): Promise<StoredFileResult> {
    if (!this.isValidPdf(buffer, mimeType)) {
      throw new AppError("Invalid file content: Only valid PDF documents are accepted", 400);
    }

    // Maximum 15MB file size limit
    if (buffer.length > 15 * 1024 * 1024) {
      throw new AppError("PDF file size exceeds maximum limit of 15MB", 400);
    }

    const sha256Hash = this.computeSha256(buffer);
    const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${sanitizedName}`;
    const normalizedFolder = this.normalizeFolderPath(folder);
    const isProduction = process.env.NODE_ENV === "production";

    // 1. Cloudinary Integration
    const hasCloudinary = Boolean(
      process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET)
    );

    if (hasCloudinary) {
      try {
        const cloudUrl = await this.uploadToCloudinary(buffer, uniqueFileName, normalizedFolder);
        return {
          url: cloudUrl,
          sha256Hash,
          sizeBytes: buffer.length,
          fileName: sanitizedName,
        };
      } catch (cloudErr: any) {
        if (isProduction) {
          throw new AppError(
            `Cloud storage upload failed: ${cloudErr.message || "Unknown error"}. Filesystem storage is disabled in production.`,
            500
          );
        }
        console.warn(`[StorageService] Cloudinary upload failed in dev/test, falling back to local storage: ${cloudErr.message}`);
      }
    } else if (isProduction) {
      throw new AppError(
        "Cloudinary storage configuration is missing in production environment. Filesystem storage is disabled.",
        500
      );
    }

    // 2. Local uploads storage abstraction (only permitted in development / testing fallback)
    const targetDir = path.join(this.uploadsDir, normalizedFolder);
    this.ensureDirectory(targetDir);

    const filePath = path.join(targetDir, uniqueFileName);
    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${normalizedFolder}/${uniqueFileName}`;

    return {
      url: relativeUrl,
      sha256Hash,
      sizeBytes: buffer.length,
      fileName: sanitizedName,
    };
  }

  /**
   * Cloudinary upload via standard HTTPS API without requiring heavy external SDK.
   * Signs and uploads raw PDF files strictly under the specified HoneyChain folder.
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<string> {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (process.env.CLOUDINARY_URL) {
      const parsed = new URL(process.env.CLOUDINARY_URL);
      apiKey = parsed.username;
      apiSecret = parsed.password;
      cloudName = parsed.hostname;
    }

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Incomplete Cloudinary credentials");
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${fileName.replace(/\.pdf$/i, "")}`;

    // Alphabetical parameter sorting required for Cloudinary signature
    const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
    const uploadFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

    formData.append("file", blob, uploadFileName);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("folder", folder);
    formData.append("public_id", publicId);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudinary HTTP ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as any;
    return data.secure_url || data.url;
  }
}

export const storageService = new StorageService();
export default storageService;
