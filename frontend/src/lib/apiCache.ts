// src/lib/apiCache.ts

export interface CacheEntry<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds
const SESSION_STORAGE_KEY = "honeychain_api_cache_v1";

// In-memory cache stores
const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

// Load initial cache from sessionStorage if in browser
if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed)) {
        const item = entry as CacheEntry;
        if (now - item.timestamp < item.ttl) {
          memoryCache.set(key, item);
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }
}

function persistToSessionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const serialized: Record<string, CacheEntry> = {};
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now - entry.timestamp < entry.ttl) {
        serialized[key] = entry;
      }
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage quota errors
  }
}

export const apiCache = {
  get<T = unknown>(key: string): CacheEntry<T> | null {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      memoryCache.delete(key);
      return null;
    }
    return entry;
  },

  set<T = unknown>(
    key: string,
    data: T,
    status = 200,
    statusText = "OK",
    headers: Record<string, string> = {},
    ttl = DEFAULT_TTL_MS
  ): void {
    const entry: CacheEntry<T> = {
      data,
      status,
      statusText,
      headers,
      timestamp: Date.now(),
      ttl,
    };
    memoryCache.set(key, entry as CacheEntry);
    persistToSessionStorage();
  },

  has(key: string): boolean {
    return this.get(key) !== null;
  },

  delete(key: string): void {
    memoryCache.delete(key);
    persistToSessionStorage();
  },

  clear(): void {
    memoryCache.clear();
    inflightRequests.clear();
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  },

  // Invalidate any cache entries matching patterns or keywords
  invalidateByPatterns(patterns: (string | RegExp)[]): void {
    for (const key of Array.from(memoryCache.keys())) {
      for (const pattern of patterns) {
        const matches =
          typeof pattern === "string" ? key.includes(pattern) : pattern.test(key);
        if (matches) {
          memoryCache.delete(key);
          break;
        }
      }
    }
    persistToSessionStorage();
  },

  // Invalidate cache based on mutated endpoint
  invalidateForMutation(url?: string): void {
    if (!url) {
      this.invalidateByPatterns(["/api/analytics"]);
      return;
    }

    const patterns: (string | RegExp)[] = ["/api/analytics"];

    if (url.includes("/batches")) patterns.push("/batches");
    if (url.includes("/hives")) patterns.push("/hives");
    if (url.includes("/harvests")) patterns.push("/harvests");
    if (url.includes("/alerts")) patterns.push("/alerts");
    if (url.includes("/apiaries")) patterns.push("/apiaries");
    if (url.includes("/auth") || url.includes("/users")) patterns.push("/auth/users");
    if (url.includes("/organizations")) patterns.push("/organizations");
    if (url.includes("/iot")) patterns.push("/iot");

    this.invalidateByPatterns(patterns);
  },

  // In-flight request deduplication
  getInflight<T = unknown>(key: string): Promise<T> | undefined {
    return inflightRequests.get(key) as Promise<T> | undefined;
  },

  setInflight<T = unknown>(key: string, promise: Promise<T>): void {
    inflightRequests.set(key, promise as Promise<unknown>);
  },

  deleteInflight(key: string): void {
    inflightRequests.delete(key);
  },
};

export function clearApiCache(): void {
  apiCache.clear();
}
