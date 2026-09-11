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
   */
  public isValidPdf(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 5) return false;
    return buffer.toString("utf8", 0, 5) === "%PDF-";
  }

  /**
   * Computes deterministic SHA-256 digest of file buffer (0x-prefixed for EVM compatibility).
   */
  public computeSha256(buffer: Buffer): string {
    const digest = crypto.createHash("sha256").update(buffer).digest("hex");
    return `0x${digest}`;
  }

  /**
   * Stores a PDF document using Cloudinary (if configured) or local protected uploads directory.
   */
  public async storePdf(
    buffer: Buffer,
    originalName: string,
    subfolder: string = "certificates"
  ): Promise<StoredFileResult> {
    if (!this.isValidPdf(buffer)) {
      throw new AppError("Invalid file content: Only valid PDF documents are accepted", 400);
    }

    // Maximum 15MB file size limit
    if (buffer.length > 15 * 1024 * 1024) {
      throw new AppError("PDF file size exceeds maximum limit of 15MB", 400);
    }

    const sha256Hash = this.computeSha256(buffer);
    const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${sanitizedName}`;

    // 1. Cloudinary Integration (if configured in environment)
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudUrl = await this.uploadToCloudinary(buffer, uniqueFileName, subfolder);
        return {
          url: cloudUrl,
          sha256Hash,
          sizeBytes: buffer.length,
          fileName: sanitizedName,
        };
      } catch (cloudErr: any) {
        console.warn(`[StorageService] Cloudinary upload failed, falling back to local storage: ${cloudErr.message}`);
      }
    }

    // 2. Local uploads storage abstraction
    const targetDir = path.join(this.uploadsDir, subfolder);
    this.ensureDirectory(targetDir);

    const filePath = path.join(targetDir, uniqueFileName);
    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${subfolder}/${uniqueFileName}`;

    return {
      url: relativeUrl,
      sha256Hash,
      sizeBytes: buffer.length,
      fileName: sanitizedName,
    };
  }

  /**
   * Optional Cloudinary upload via standard HTTPS API without requiring heavy external SDK.
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
    const publicId = `${folder}/${fileName.replace(/\.pdf$/i, "")}`;
    const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
    formData.append("file", blob, fileName);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("public_id", publicId);
    formData.append("folder", folder);
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
