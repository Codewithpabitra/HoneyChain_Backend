import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import batchRoutes from "./routes/batch.routes.js";
import verifyRoutes from "./routes/verify.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import AppError from "./utils/AppError.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "HoneyChain backend is running yehh",
    version: "1.0.0",
    network: "Ethereum Sepolia",
  });
});

// Mount Routes
app.use("/api/batches", batchRoutes);
app.use("/api/verify", verifyRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
