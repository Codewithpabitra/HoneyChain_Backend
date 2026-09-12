import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a lab report URL safely, ensuring absolute URLs are not double-prefixed
 * and relative URLs are properly rooted to the backend API base.
 */
export function resolveLabReportUrl(rawUrl?: string, batchId?: string): string {
  if (!rawUrl || !rawUrl.trim()) {
    return batchId
      ? `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "")}/api/batches/${encodeURIComponent(batchId)}/certificate`
      : "";
  }

  const trimmed = rawUrl.trim();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

  // If URL routes to Cloudinary raw upload, use backend certificate proxy to avoid CORS / raw download issues
  if (trimmed.includes("res.cloudinary.com") || trimmed.includes("raw/upload")) {
    return batchId
      ? `${apiBase}/api/batches/${encodeURIComponent(batchId)}/certificate`
      : trimmed;
  }

  // If already absolute URL, return as-is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Relative URL: ensure single leading slash and prefix with apiBase
  return `${apiBase}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}