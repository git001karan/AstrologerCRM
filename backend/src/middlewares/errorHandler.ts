import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Custom operational error class to represent expected application failures
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware for Express
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err instanceof AppError ? err.statusCode : (err.status || 500);
  const errorMessage = err.message || 'Internal Server Error';

  // Log the error using our Winston logger
  logger.error('API Error Occurred', {
    message: errorMessage,
    status: statusCode,
    stack: !isProduction ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    status: statusCode,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
