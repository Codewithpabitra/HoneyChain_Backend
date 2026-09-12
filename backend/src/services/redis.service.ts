import { Redis } from "ioredis";
import { env } from "../config/env.js";

export class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  private fallbackStore: Map<string, any[]> = new Map();
  private readonly recentLimit: number;

  constructor() {
    this.recentLimit = env.TELEMETRY_RECENT_LIMIT || 10;
    this.init();
  }

  private init() {
    if (process.env.NODE_ENV === "test" && !env.REDIS_URL) {
      // In tests without REDIS_URL, rely on in-memory fallback
      return;
    }

    if (!env.REDIS_URL) {
      console.warn("[RedisService] REDIS_URL not configured. Operating in in-memory buffer mode.");
      return;
    }

    try {
      let connectionString = env.REDIS_URL.trim();
      if (!connectionString.startsWith("redis://") && !connectionString.startsWith("rediss://")) {
        connectionString = `redis://${connectionString}`;
      }

      this.client = new Redis(connectionString, {
        password: env.REDIS_PASSWORD || undefined,
        connectTimeout: 8000,
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 5) {
            return null; // Stop retrying after 5 attempts to avoid log spam
          }
          return Math.min(times * 500, 3000);
        },
        lazyConnect: false,
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        console.log("[RedisService] Successfully connected to Redis telemetry cache.");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
      });

      this.client.on("error", (err: any) => {
        this.isConnected = false;
        if (err?.code !== "ECONNREFUSED" && !err?.message?.includes("connect ECONNREFUSED")) {
          console.warn(`[RedisService] Connection warning: ${err.message}. Using fallback in-memory buffer.`);
        }
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });
    } catch (err: any) {
      console.warn(`[RedisService] Initialization failed: ${err.message}. Falling back to in-memory buffer.`);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Generates the Redis key for a hive's recent telemetry rolling list.
   */
  private getHiveKey(hiveId: string): string {
    return `hive:${hiveId}:telemetry:recent`;
  }

  /**
   * Helper to check if an existing buffered reading matches a candidate reading.
   * Matches by unique reading ID or by deviceId + exact timestamp.
   */
  public isMatchingReading(existing: any, candidate: any): boolean {
    if (!existing || !candidate) return false;

    // Check unique ID / readingId match
    const existingId = existing.id || existing.readingId;
    const candidateId = candidate.id || candidate.readingId;
    if (existingId && candidateId && String(existingId) === String(candidateId)) {
      return true;
    }

    // Check deviceId and timestamp match
    if (existing.deviceId && candidate.deviceId && existing.deviceId === candidate.deviceId) {
      const existingTime = existing.timestamp ? new Date(existing.timestamp).getTime() : NaN;
      const candidateTime = candidate.timestamp ? new Date(candidate.timestamp).getTime() : NaN;
      if (!isNaN(existingTime) && !isNaN(candidateTime) && existingTime === candidateTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Stores a valid telemetry reading in a rolling list, keeping only the latest N readings.
   * Rejects duplicate readings that have identical unique reading IDs or deviceId + timestamp.
   * Returns true if the reading was added, or false if it was rejected as a duplicate.
   */
  public async addRecentReading(hiveId: string, reading: any): Promise<boolean> {
    const cleanHiveId = hiveId.trim();

    // 1. Try writing to Redis
    if (this.client && this.isConnected) {
      try {
        const key = this.getHiveKey(cleanHiveId);

        // Deduplication check in Redis buffer
        const existingItems = await this.client.lrange(key, 0, this.recentLimit - 1);
        if (existingItems && existingItems.length > 0) {
          for (const raw of existingItems) {
            try {
              const parsed = JSON.parse(raw);
              if (this.isMatchingReading(parsed, reading)) {
                return false; // Duplicate found, skip LPUSH
              }
            } catch {
              // ignore json parse error
            }
          }
        }

        const serialized = JSON.stringify(reading);
        const pipeline = this.client.pipeline();
        pipeline.lpush(key, serialized);
        pipeline.ltrim(key, 0, this.recentLimit - 1);
        pipeline.expire(key, 60 * 60 * 24 * 7); // 7 days TTL
        await pipeline.exec();
        return true;
      } catch (err: any) {
        console.warn(`[RedisService] Failed to write to Redis: ${err.message}. Using in-memory store.`);
      }
    }

    // 2. Fallback in-memory rolling list
    const current = this.fallbackStore.get(cleanHiveId) || [];
    if (current.some((item) => this.isMatchingReading(item, reading))) {
      return false; // Duplicate found in memory buffer
    }

    current.unshift(reading);
    if (current.length > this.recentLimit) {
      current.length = this.recentLimit;
    }
    this.fallbackStore.set(cleanHiveId, current);
    return true;
  }

  /**
   * Retrieves the latest N readings for a hive in chronological order (oldest to newest).
   */
  public async getRecentReadings(hiveId: string): Promise<any[]> {
    // 1. Try reading from Redis
    if (this.client && this.isConnected) {
      try {
        const key = this.getHiveKey(hiveId);
        const items = await this.client.lrange(key, 0, this.recentLimit - 1);
        if (items && items.length > 0) {
          // Items are LPUSH'd (newest first). Reverse to return chronological order (oldest to newest).
          return items.map((raw) => JSON.parse(raw)).reverse();
        }
      } catch (err: any) {
        console.warn(`[RedisService] Failed to read from Redis: ${err.message}. Checking in-memory store.`);
      }
    }

    // 2. Fallback in-memory store
    const fallback = this.fallbackStore.get(hiveId) || [];
    // Fallback store holds newest at index 0. Reverse for chronological order.
    return [...fallback].reverse();
  }

  /**
   * Clears recent readings for a hive (useful for testing).
   */
  public async clearRecentReadings(hiveId: string): Promise<void> {
    this.fallbackStore.delete(hiveId.trim());
    if (this.client && this.isConnected) {
      try {
        await this.client.del(this.getHiveKey(hiveId.trim()));
      } catch {
        // ignore
      }
    }
  }

  /**
   * Clears all recent readings across all hives (useful for test suite isolation).
   */
  public async clearAll(): Promise<void> {
    this.fallbackStore.clear();
    if (this.client && this.isConnected) {
      try {
        const keys = await this.client.keys("hive:*:telemetry:recent");
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Closes the Redis connection gracefully.
   */
  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Returns whether Redis is actively connected.
   */
  public isReady(): boolean {
    return this.isConnected;
  }
}

export const redisService = new RedisService();
export default redisService;
