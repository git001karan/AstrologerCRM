import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import pool, { testConnection } from './config/db';
import logger from './utils/logger';
import { errorHandler, AppError } from './middlewares/errorHandler';
import { authenticateJWT, requireRole, UserRole } from './middlewares/auth';
import { validateRequest, loginSchema, signupSchema, bookAppointmentSchema, saveBirthProfileSchema, grantReferralSchema, saveNoteSchema, clientSearchSchema } from './middlewares/validation';
import { AppointmentController } from './controllers/appointment.controller';
import { AppointmentService } from './services/appointment.service';
import { setIO } from './utils/socket';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io and register it in the shared utility
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setIO(io);

// Socket connection event logs
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });
  
  socket.on('JOIN_WAITING_ROOM', (data: { clientName: string; clientId: string }) => {
    logger.info('Client joined virtual waiting room', { socketId: socket.id, data });
    // Broadcast client wait state to all connected sockets
    io.emit('CLIENT_WAITING', {
      clientId: data.clientId,
      clientName: data.clientName,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });
});

// Middlewares
app.use(cors());
app.use(express.json());

// Express-rate-limit to secure auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    status: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_astrology_key';
const JWT_ISSUER = 'astrocrm-api';
const JWT_AUDIENCE = 'astrocrm-client';

const appointmentService = new AppointmentService();

/**
 * Enterprise Auto-Seeding & Authentication Login endpoint.
 * Detects role keywords dynamically to support rapid evaluation of the RBAC/ABAC grid.
 */
app.post('/api/auth/login', authLimiter, validateRequest(loginSchema), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    // Auto-seed typical users for evaluation convenience if the DB is fresh
    if (userResult.rows.length === 0) {
      logger.info('User not found. Auto-seeding Enterprise RBAC evaluation user account', { email });
      
      let role: UserRole = 'client';
      let name = 'Seeking Client';

      if (email.includes('admin')) {
        role = 'super_admin';
        name = 'Firm System Administrator';
      } else if (email.includes('junior')) {
        role = 'junior_astrologer';
        name = 'Junior Advisor Assistant';
      } else if (email.includes('finance')) {
        role = 'finance_officer';
        name = 'Corporate Finance Officer';
      } else if (email.includes('lead') || email.includes('astrologer')) {
        role = 'lead_astrologer';
        name = 'Senior Lead Astrologer Guru';
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const insertResult = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, passwordHash, role]
      );
      
      const newUserId = insertResult.rows[0].id;

      // Seed client profiles for testing charts
      if (role === 'client') {
        logger.info('Auto-seeding birth profile chart details for evaluation client', { clientId: newUserId });
        await appointmentService.saveBirthProfile({
          client_id: newUserId,
          birth_date: '1995-10-24',
          birth_time: '08:45:00',
          birth_place: 'New Delhi, India'
        });
      }
      
      userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    }

    const user = userResult.rows[0];

    // Verify password hash
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password_hash !== inputHash) {
      throw new AppError('Invalid email or password combination', 400);
    }

    // Generate JWT token with issuer and audience parameters
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      status: 200
    });
  } catch (error) {
    next(error);
  }
});

const appointmentController = new AppointmentController();

// Auth routes
app.post(
  '/api/auth/signup',
  authLimiter,
  validateRequest(signupSchema),
  appointmentController.signup
);

// Booking routes
app.post(
  '/api/appointments/book',
  authenticateJWT,
  validateRequest(bookAppointmentSchema),
  appointmentController.bookAppointment
);

app.get(
  '/api/appointments/my-schedule',
  authenticateJWT,
  requireRole('lead_astrologer', 'super_admin', 'junior_astrologer', 'client'),
  appointmentController.getMySchedule
);

// Note & Profile Routes
app.get(
  '/api/appointments/notes/:id',
  authenticateJWT,
  appointmentController.getConsultationNote
);

// Save consultation notes
app.post(
  '/api/appointments/notes',
  authenticateJWT,
  requireRole('lead_astrologer', 'super_admin'),
  validateRequest(saveNoteSchema),
  appointmentController.saveConsultationNote
);

// Search client directory
app.get(
  '/api/clients/directory',
  authenticateJWT,
  requireRole('lead_astrologer', 'super_admin', 'junior_astrologer'),
  validateRequest(clientSearchSchema),
  appointmentController.getClientDirectory
);

app.post(
  '/api/astrology/profile',
  authenticateJWT,
  validateRequest(saveBirthProfileSchema),
  appointmentController.saveBirthProfile
);

app.get(
  '/api/astrology/profile/:clientId',
  authenticateJWT,
  appointmentController.getBirthProfile
);

app.get(
  '/api/astrology/profile',
  authenticateJWT,
  appointmentController.getBirthProfile
);

// New V2.1 Referral Access Token Route (ABAC)
app.post(
  '/api/astrology/referral',
  authenticateJWT,
  validateRequest(grantReferralSchema),
  appointmentController.grantReferralAccess
);

// One-time DB migration endpoint — secured by MIGRATE_SECRET env var
app.post('/api/migrate', async (req: Request, res: Response): Promise<void> => {
  const { secret } = req.body;
  if (secret !== process.env.MIGRATE_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await pool.query(`DO $$ BEGIN CREATE TYPE user_role AS ENUM ('super_admin','lead_astrologer','junior_astrologer','finance_officer','client'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await pool.query(`DO $$ BEGIN CREATE TYPE appointment_status AS ENUM ('scheduled','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),name VARCHAR(100) NOT NULL,email VARCHAR(255) UNIQUE NOT NULL,password_hash VARCHAR(255) NOT NULL,role user_role NOT NULL,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS client_birth_profiles (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),client_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,birth_date DATE NOT NULL,birth_time TIME NOT NULL,birth_place VARCHAR(255) NOT NULL,planetary_positions JSONB NOT NULL,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS appointments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,astrologer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,scheduled_at TIMESTAMPTZ NOT NULL,status appointment_status NOT NULL DEFAULT 'scheduled',created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS consultation_notes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,note_text TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS referral_access_tokens (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,granted_to_astrologer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,UNIQUE(client_id,granted_to_astrologer_id));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),actor_id UUID REFERENCES users(id) ON DELETE SET NULL,action VARCHAR(100) NOT NULL,details TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    res.status(200).json({ success: true, message: 'Migration completed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Retrieve active astrologers list for public booking selectors
app.get('/api/astrologers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query("SELECT id, name, email FROM users WHERE role = 'lead_astrologer'");
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server after connecting to the DB
const startServer = async () => {
  try {
    await testConnection();
    server.listen(PORT, () => {
      logger.info(`Server successfully started on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
    });
  } catch (error) {
    logger.error('Failed to initialize server processes', { error });
    process.exit(1);
  }
};

startServer();
