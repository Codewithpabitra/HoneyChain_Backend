import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let nextHandler: ((req: any, res: any) => Promise<void>) | null = null;
let nextAppInstance: any = null;

/**
 * Resolves the root directory of the Next.js frontend project.
 */
export function getFrontendDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "frontend"),
    path.resolve(process.cwd(), "../frontend"),
    path.resolve(__dirname, "../../frontend"),
    path.resolve(__dirname, "../frontend"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Initializes the Next.js application and prepares the request handler.
 */
export async function initNextApp(options?: { force?: boolean }): Promise<((req: any, res: any) => Promise<void>) | null> {
  if (nextHandler) {
    return nextHandler;
  }

  // Skip heavyweight Next.js prepare during unit tests unless explicitly forced
  if (process.env.NODE_ENV === "test" && !options?.force) {
    return null;
  }

  const frontendDir = getFrontendDir();
  if (!frontendDir) {
    console.warn("[HoneyChain Frontend] Could not locate frontend directory. Operating in API-only mode.");
    return null;
  }

  try {
    let nextFunc: any = null;

    // 1. Try resolving next from the standard module path or frontend node_modules
    try {
      const nextPkg = "next";
      const standardNext = (await import(nextPkg)) as any;
      nextFunc = standardNext.default || standardNext;
    } catch {
      // 2. Fall back to loading next from frontend/node_modules if backend doesn't have it installed
      const frontendNextPath = path.resolve(frontendDir, "node_modules/next/dist/server/next.js");
      if (fs.existsSync(frontendNextPath)) {
        const localNext = (await import(frontendNextPath)) as any;
        nextFunc = localNext.default || localNext;
      }
    }

    if (!nextFunc) {
      console.warn("[HoneyChain Frontend] Next.js library not found. Operating in API-only mode.");
      return null;
    }

    const hasNextBuild = fs.existsSync(path.join(frontendDir, ".next", "BUILD_ID"));
    const isDev = process.env.NEXT_DEV === "true" || (process.env.NODE_ENV === "development" && !hasNextBuild);
    
    nextAppInstance = nextFunc({
      dev: isDev,
      dir: frontendDir,
    });

    await nextAppInstance.prepare();
    nextHandler = nextAppInstance.getRequestHandler();

    console.log(
      `[HoneyChain Frontend] Next.js application ready (${isDev ? "Development" : "Production"} mode from ${frontendDir})`
    );
    return nextHandler;
  } catch (err: any) {
    console.warn(`[HoneyChain Frontend] Failed to initialize Next.js: ${err.message}. Operating in API-only mode.`);
    return null;
  }
}

/**
 * Returns the active Next.js request handler, or null if not yet initialized.
 */
export function getNextHandler(): ((req: any, res: any) => Promise<void>) | null {
  return nextHandler;
}

/**
 * Checks if the Next.js frontend has been prepared and is ready to serve requests.
 */
export function isNextReady(): boolean {
  return Boolean(nextHandler);
}
