import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import batchRoutes from "./routes/batch.routes.js";
import verifyRoutes from "./routes/verify.routes.js";
import iotRoutes from "./routes/iot.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import AppError from "./utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the frontend directory path across local dev and containerized deployments.
 */
export function getFrontendDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "frontend"),
    path.resolve(process.cwd(), "../frontend"),
    path.resolve(process.cwd(), "public"),
    path.resolve(__dirname, "../../frontend"),
    path.resolve(__dirname, "../frontend"),
    path.resolve(__dirname, "../../public"),
    path.resolve(__dirname, "../public"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

const app = express();
const frontendDir = getFrontendDir();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend assets if directory is resolved
if (frontendDir) {
  app.use(express.static(frontendDir, { index: false }));
}

// Root Information / Landing Page
app.get("/", (req, res) => {
  if (frontendDir && fs.existsSync(path.join(frontendDir, "index.html")) && req.accepts("html")) {
    return res.sendFile(path.join(frontendDir, "index.html"));
  }

  res.json({
    success: true,
    message: "HoneyChain backend is running yehh",
    version: "1.0.0",
    network: "Ethereum Sepolia",
  });
});

// Dedicated Production Health Check
app.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? "ok" : "degraded";
  const statusCode = isDbConnected ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? "connected" : "disconnected",
    },
    blockchain: {
      network: "Ethereum Sepolia",
      chainId: 11155111,
    },
  });
});

// Mount Operational & Provenance Routes
app.use("/api/batches", batchRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/iot", iotRoutes);

// Fallback for HTML navigation routes (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }
  if (req.path.startsWith("/api") || req.path === "/health") {
    return next();
  }
  if (frontendDir && fs.existsSync(path.join(frontendDir, "index.html")) && req.accepts("html")) {
    return res.sendFile(path.join(frontendDir, "index.html"));
  }
  next();
});

// 404 Route Handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
