import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { User, IUser } from "../models/User.js";
import { Hive } from "../models/Hive.js";
import authService from "./auth.service.js";
import { env } from "../config/env.js";

export interface SocketUser extends IUser {
  _id: any;
}

export class SocketService {
  private io: Server | null = null;

  public init(httpServer: HttpServer): Server {
    if (this.io) {
      return this.io;
    }

    const allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      ...(env.FRONTEND_URL ? env.FRONTEND_URL.split(",").map((s) => s.trim().replace(/\/+$/, "")) : []),
      ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim().replace(/\/+$/, "")) : []),
    ];

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            return callback(null, true);
          }
          if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
          }
          if (origin.endsWith(".onrender.com") || origin.endsWith(".vercel.app") || origin.includes("503error.in")) {
            return callback(null, true);
          }
          return callback(null, true);
        },
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    // 1. JWT Authentication Middleware for Socket Connections
    this.io.use(async (socket: Socket, next) => {
      try {
        let token: string | undefined =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization;

        if (token && token.startsWith("Bearer ")) {
          token = token.slice(7).trim();
        }

        if (!token) {
          return next(new Error("Authentication error: No Bearer token provided in handshake"));
        }

        const decoded = authService.verifyToken(token);
        const user = await User.findById(decoded.sub).populate("organizationId").lean();
        if (!user) {
          return next(new Error("Authentication error: User account does not exist"));
        }

        socket.data.user = user;
        socket.data.userId = user._id.toString();
        socket.data.userRole = user.role;
        return next();
      } catch (err: any) {
        return next(new Error(`Authentication error: ${err.message}`));
      }
    });

    // 2. Connection and Room Subscription Handlers
    this.io.on("connection", (socket: Socket) => {
      const user = socket.data.user;

      // Join a specific hive room with tenant authorization
      socket.on("join:hive", async (payload: { hiveId?: string }, callback?: (res: any) => void) => {
        try {
          const hiveId = payload?.hiveId?.trim();
          if (!hiveId) {
            callback?.({ success: false, error: "hiveId is required" });
            return;
          }

          // Check authorization: Admin & Auditor can view any hive
          const isAdmin = user.role === "admin" || user.role === "auditor";
          if (!isAdmin) {
            const hive = await Hive.findOne({ hiveId }).lean();
            if (!hive) {
              callback?.({ success: false, error: `Hive '${hiveId}' not found` });
              return;
            }

            const userOrgId = user.organizationId?._id?.toString() || user.organizationId?.toString();
            const hiveOrgId = (hive.organizationId as any)?._id?.toString() || hive.organizationId?.toString();
            const userWallet = (user.walletAddress || user.organizationId?.walletAddress || "").toLowerCase();
            const hiveBeekeeper = (hive.beekeeper || "").toLowerCase();

            const isOrgMatch = Boolean(userOrgId && hiveOrgId && userOrgId === hiveOrgId);
            const isBeekeeperMatch = Boolean(userWallet && hiveBeekeeper && (userWallet === hiveBeekeeper || hiveBeekeeper.includes(user.email.toLowerCase())));
            const isCreator = Boolean(hive.createdBy && hive.createdBy.toString() === user._id.toString());

            if (!isOrgMatch && !isBeekeeperMatch && !isCreator) {
              callback?.({ success: false, error: "Unauthorized access to hive telemetry" });
              return;
            }
          }

          const room = `hive:${hiveId}`;
          socket.join(room);
          callback?.({ success: true, room, hiveId });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      });

      // Leave a specific hive room
      socket.on("leave:hive", (payload: { hiveId?: string }, callback?: (res: any) => void) => {
        const hiveId = payload?.hiveId?.trim();
        if (hiveId) {
          socket.leave(`hive:${hiveId}`);
          callback?.({ success: true, hiveId });
        }
      });

      socket.on("disconnect", () => {
        // Rooms are automatically cleaned up by Socket.IO on disconnect
      });
    });

    console.log("[SocketService] Socket.IO server initialized on shared HTTP server.");
    return this.io;
  }

  /**
   * Broadcasts a live telemetry reading to all subscribers of a hive room.
   */
  public emitHiveTelemetry(hiveId: string, reading: any): void {
    if (!this.io) return;
    const room = `hive:${hiveId.trim()}`;
    this.io.to(room).emit("telemetry:received", reading);
  }

  /**
   * Returns the underlying Socket.IO server instance.
   */
  public getIO(): Server | null {
    return this.io;
  }

  /**
   * Closes the Socket.IO server gracefully.
   */
  public close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
