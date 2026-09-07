import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";

const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  if (!isOperational) {
    console.error("Unexpected Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

export default errorHandler;