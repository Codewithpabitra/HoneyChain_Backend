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
import mlRoutes from "./routes/ml.routes.js";
import authRoutes from "./routes/auth.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import AppError from "./utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { getNextHandler, getFrontendDir } from "./services/frontend.service.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Root Information / Landing Page
app.get("/", (req, res, next) => {
  // If API client explicitly asking for JSON without HTML, return API metadata
  if (!req.accepts("html") && req.accepts("json")) {
    return res.json({
      success: true,
      message: "HoneyChain backend is running yehh",
      version: "1.0.0",
      network: "Ethereum Sepolia",
    });
  }

  const nextHandler = getNextHandler();
  if (nextHandler) {
    return nextHandler(req, res);
  }

  // Fast HTML fallback for test/offline environments
  res.type("html").send(
    `<!DOCTYPE html><html><head><title>HoneyChain</title></head><body><h1>HoneyChain</h1><p>Ethereum Sepolia Batch Provenance Verification Platform</p></body></html>`
  );
});

// Mount Operational & Provenance Routes
app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/ml", mlRoutes);

// Dedicated Consumer QR Verification Web Page Route
app.get(["/verify", "/verify/:batchId"], (req, res, next) => {
  const nextHandler = getNextHandler();
  if (nextHandler) {
    return nextHandler(req, res);
  }

  const batchId = (req.params as any)?.batchId || "";
  res
    .status(200)
    .type("html")
    .send(
      `<!DOCTYPE html><html><head><title>HoneyChain Verification</title></head><body><h1>HoneyChain Consumer Verification</h1><div id="verifyDisplayArea">${batchId}</div></body></html>`
    );
});

// Next.js Catch-All Handler for all frontend pages and assets (/_next/*, /login, /farmer/*, etc.)
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health") {
    return next();
  }

  const nextHandler = getNextHandler();
  if (nextHandler) {
    return nextHandler(req, res);
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
