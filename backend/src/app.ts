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

import { env } from "./config/env.js";

const app = express();

// Cross-Origin Resource Sharing (CORS) Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  ...(env.FRONTEND_URL ? env.FRONTEND_URL.split(",").map((s) => s.trim().replace(/\/+$/, "")) : []),
  ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim().replace(/\/+$/, "")) : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin is explicitly allowed
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      // Allow any localhost origin in non-production
      if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow Render and Vercel preview/production domains
      if (origin.endsWith(".onrender.com") || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      // Permissive fallback so legitimate client calls are not blocked
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Set-Cookie"],
  })
);

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
app.get("/", (req, res) => {
  // If API client explicitly asking for JSON without HTML, return API metadata
  if (!req.accepts("html") && req.accepts("json")) {
    return res.json({
      success: true,
      message: "HoneyChain backend is running yehh",
      version: "1.0.0",
      network: "Ethereum Sepolia",
    });
  }

  // Fast HTML fallback for browser clients and tests
  res.type("html").send(
    `<!DOCTYPE html><html><head><title>HoneyChain API</title></head><body><h1>HoneyChain</h1><p>Ethereum Sepolia Batch Provenance Verification Platform API</p></body></html>`
  );
});

// Mount Operational & Provenance Routes
app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/ml", mlRoutes);

// Dedicated Consumer QR Verification Route
app.get(["/verify", "/verify/:batchId"], (req, res) => {
  const batchId = (req.params as any)?.batchId || "";
  res
    .status(200)
    .type("html")
    .send(
      `<!DOCTYPE html><html><head><title>HoneyChain Verification</title></head><body><h1>HoneyChain Consumer Verification</h1><div id="verifyDisplayArea">${batchId}</div></body></html>`
    );
});

// 404 Route Handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
