import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Sanitizes a MongoDB connection URI to mask credentials in logs.
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.username || url.password) {
      url.username = "***";
      url.password = "***";
    }
    return url.toString();
  } catch {
    // If not standard URL format (e.g. complex replica set string), regex mask password
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://***:***@");
  }
}

/**
 * Mongoose connection options optimized for high-volume production & IoT telemetry.
 */
export const mongooseOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  autoIndex: true, // Build indexes on startup (ideal for dev & single-instance deployments)
};

let isConnected = false;

/**
 * Connects to MongoDB with connection pooling and event listeners.
 */
export async function connectDB(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const sanitizedUri = sanitizeMongoUri(uri);

  try {
    // Set up connection event listeners
    mongoose.connection.on("connected", () => {
      console.log(`[MongoDB] Connected successfully to ${sanitizedUri}`);
    });

    mongoose.connection.on("error", (err) => {
      console.error("[MongoDB] Connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[MongoDB] Disconnected from database");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("[MongoDB] Reconnected to database");
      isConnected = true;
    });

    const conn = await mongoose.connect(uri, mongooseOptions);
    isConnected = true;
    return conn;
  } catch (err: any) {
    console.error(`[MongoDB] Fatal connection error to ${sanitizedUri}:`, err.message);
    throw err;
  }
}

/**
 * Disconnects from MongoDB cleanly.
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    isConnected = false;
    console.log("[MongoDB] Connection closed successfully");
  }
}

/**
 * Configures graceful process termination handlers.
 */
export function setupGracefulShutdown(server?: any, cleanup?: () => Promise<void> | void): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[Process] Received ${signal}. Commencing graceful shutdown...`);

    if (server && typeof server.close === "function") {
      server.close(() => {
        console.log("[Server] HTTP server stopped accepting new requests");
      });
    }

    if (typeof cleanup === "function") {
      try {
        await cleanup();
      } catch (err: any) {
        console.warn("[Process] Warning during custom cleanup:", err.message);
      }
    }

    try {
      await disconnectDB();
      console.log("[Process] Graceful shutdown complete. Exiting cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("[Process] Error during database shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
