import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z } from 'zod';
import { AppError } from './errorHandler';

/**
 * Reusable Express request validator schema container
 */
interface RequestValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Higher-order middleware function to run Zod schema validation on requests
 */
export const validateRequest = (schema: RequestValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Compile Zod issues into a readable error message
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
        next(new AppError(`Validation failed: ${messages}`, 400));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Zod validation schema for Login Endpoint
 */
export const loginSchema = {
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters in length'),
  }),
};

/**
 * Zod validation schema for Signup Endpoint
 */
export const signupSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters in length'),
    role: z.enum(['super_admin', 'lead_astrologer', 'junior_astrologer', 'finance_officer', 'client']).default('client'),
  }),
};

/**
 * Zod validation schema for Booking Endpoint
 */
export const bookAppointmentSchema = {
  body: z.object({
    astrologer_id: z.string().uuid('Astrologer ID must be a valid UUID format'),
    scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduled_at must be a valid ISO 8601 date string',
    }),
  }),
};

/**
 * Zod validation schema for Creating/Updating Client Birth Profile
 */
export const saveBirthProfileSchema = {
  body: z.object({
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_date must match YYYY-MM-DD format'),
    birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'birth_time must match HH:MM or HH:MM:SS format'),
    birth_place: z.string().min(2, 'birth_place must be at least 2 characters long').max(100, 'birth_place is too long'),
  }),
};

/**
 * Zod validation schema for Granting Temporary Referral Access (ABAC feature)
 */
export const grantReferralSchema = {
  body: z.object({
    client_id: z.string().uuid('Client ID must be a valid UUID format'),
    granted_to_astrologer_id: z.string().uuid('Astrologer ID must be a valid UUID format'),
    duration_seconds: z.number().int().min(60, 'Minimum duration is 60 seconds').max(604800, 'Maximum duration is 7 days (604800 seconds)'),
  }),
};

/**
 * Zod validation schema for Saving Consultation Notes
 */
export const saveNoteSchema = {
  body: z.object({
    appointment_id: z.string().uuid('Appointment ID must be a valid UUID format'),
    note_text: z.string().min(5, 'Consultation note must be at least 5 characters long'),
  }),
};

/**
 * Zod validation schema for Searching Client Directory
 */
export const clientSearchSchema = {
  query: z.object({
    search: z.string().optional().default(''),
    page: z.string().optional().default('1').transform((val) => parseInt(val, 10)),
    limit: z.string().optional().default('10').transform((val) => parseInt(val, 10)),
  }),
};
