// frontend/src/services/socket.service.ts
import { io, Socket } from "socket.io-client";
import type { TelemetryHistoryPoint } from "@/types/telemetry";

class SocketService {
  private socket: Socket | null = null;
  private currentHiveId: string | null = null;
  private telemetryListeners: Set<(data: TelemetryHistoryPoint) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();

  /**
   * Initializes or returns the singleton Socket.IO connection.
   */
  public connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.connect();
      return this.socket;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("honeychain_token") : null;

    this.socket = io(apiUrl, {
      auth: {
        token: token ? `Bearer ${token}` : "",
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this.notifyStatus(true);
      // Automatically rejoin hive room if reconnecting
      if (this.currentHiveId) {
        this.socket?.emit("join:hive", { hiveId: this.currentHiveId });
      }
    });

    this.socket.on("disconnect", () => {
      this.notifyStatus(false);
    });

    this.socket.on("connect_error", () => {
      this.notifyStatus(false);
    });

    this.socket.on("telemetry:received", (data: TelemetryHistoryPoint) => {
      this.telemetryListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error("Error in telemetry socket listener:", err);
        }
      });
    });

    return this.socket;
  }

  /**
   * Joins a hive telemetry room.
   */
  public joinHive(hiveId: string): void {
    this.currentHiveId = hiveId.trim();
    const socket = this.connect();
    if (socket.connected) {
      socket.emit("join:hive", { hiveId: this.currentHiveId });
    }
  }

  /**
   * Leaves the active hive room.
   */
  public leaveHive(hiveId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("leave:hive", { hiveId: hiveId.trim() });
    }
    if (this.currentHiveId === hiveId.trim()) {
      this.currentHiveId = null;
    }
  }

  /**
   * Subscribes to live telemetry updates. Returns an unsubscribe function.
   */
  public onTelemetry(callback: (data: TelemetryHistoryPoint) => void): () => void {
    this.telemetryListeners.add(callback);
    return () => {
      this.telemetryListeners.delete(callback);
    };
  }

  /**
   * Subscribes to connection status changes (connected / disconnected).
   */
  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    if (this.socket) {
      callback(this.socket.connected);
    }
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (err) {
        console.error("Error in socket status listener:", err);
      }
    });
  }

  /**
   * Disconnects the socket completely (e.g. on logout).
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentHiveId = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
