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
   * Stores a valid telemetry reading in a rolling list, keeping only the latest N readings.
   */
  public async addRecentReading(hiveId: string, reading: any): Promise<void> {
    const serialized = JSON.stringify(reading);

    // 1. Try writing to Redis
    if (this.client && this.isConnected) {
      try {
        const key = this.getHiveKey(hiveId);
        const pipeline = this.client.pipeline();
        pipeline.lpush(key, serialized);
        pipeline.ltrim(key, 0, this.recentLimit - 1);
        pipeline.expire(key, 60 * 60 * 24 * 7); // 7 days TTL
        await pipeline.exec();
        return;
      } catch (err: any) {
        console.warn(`[RedisService] Failed to write to Redis: ${err.message}. Using in-memory store.`);
      }
    }

    // 2. Fallback in-memory rolling list
    const current = this.fallbackStore.get(hiveId) || [];
    current.unshift(reading);
    if (current.length > this.recentLimit) {
      current.length = this.recentLimit;
    }
    this.fallbackStore.set(hiveId, current);
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
    this.fallbackStore.delete(hiveId);
    if (this.client && this.isConnected) {
      try {
        await this.client.del(this.getHiveKey(hiveId));
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
