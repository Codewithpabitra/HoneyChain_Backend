import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import batchRoutes from "./routes/batch.routes.js";
import verifyRoutes from "./routes/verify.routes.js";
import iotRoutes from "./routes/iot.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import AppError from "./utils/AppError.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root Information
app.get("/", (req, res) => {
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

// 404 Route Handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
