import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

// Type representing the expanded roles
export type UserRole = 'super_admin' | 'lead_astrologer' | 'junior_astrologer' | 'finance_officer' | 'client';

// Extend the Express Request type globally to include the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_astrology_key';
const JWT_ISSUER = 'astrocrm-api';
const JWT_AUDIENCE = 'astrocrm-client';

/**
 * Middleware to authenticate requests using JWT from the Authorization header.
 * Enforces claims validation (issuer, audience, and custom fields).
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token missing or invalid format', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify standard claims automatically via jwt options
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as any;

    const allowedRoles: UserRole[] = ['super_admin', 'lead_astrologer', 'junior_astrologer', 'finance_officer', 'client'];

    // Explicit custom claims validations: verify role is recognized and payload contains ID
    if (!decoded.id || !decoded.role || !allowedRoles.includes(decoded.role)) {
      logger.warn('Token rejected: failed custom claims validation', { decoded });
      return next(new AppError('Token verification failed: invalid custom claims', 403));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as UserRole
    };

    next();
  } catch (error) {
    logger.warn('Failed JWT verification attempt', { error: error instanceof Error ? error.message : error });
    return next(new AppError('Invalid, expired, or untrusted authentication token', 401));
  }
};

/**
 * Helper to generate secure JWT tokens with standardized and custom claims
 */
export const generateToken = (payload: { id: string; email: string; role: UserRole }): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Middleware to enforce Role-Based Access Control (RBAC)
 * @param allowedRoles List of roles permitted to access the route
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required for this resource', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Forbidden access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      return next(new AppError('Forbidden: Access is denied for your user role', 403));
    }

    next();
  };
};
