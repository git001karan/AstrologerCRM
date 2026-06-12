import { Pool } from 'pg';
import logger from '../utils/logger';

// Load database connection configurations from environment variables.
// These are typical defaults that will align with our Docker Compose setup.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'astrologer_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '2000', 10),
});

// Log pool errors on idle clients to prevent silent process crashes
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
});

// Helper for testing connection on startup
export const testConnection = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    logger.info('Successfully connected to PostgreSQL database', { serverTime: res.rows[0].now });
  } finally {
    client.release();
  }
};

// Runs schema migrations automatically on every startup (idempotent)
export const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`DO $$ BEGIN CREATE TYPE user_role AS ENUM ('super_admin','lead_astrologer','junior_astrologer','finance_officer','client'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`DO $$ BEGIN CREATE TYPE appointment_status AS ENUM ('scheduled','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await client.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role user_role NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS client_birth_profiles (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, birth_date DATE NOT NULL, birth_time TIME NOT NULL, birth_place VARCHAR(255) NOT NULL, planetary_positions JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS appointments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, astrologer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, scheduled_at TIMESTAMPTZ NOT NULL, status appointment_status NOT NULL DEFAULT 'scheduled', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS consultation_notes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE, note_text TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS referral_access_tokens (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, granted_to_astrologer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, UNIQUE(client_id, granted_to_astrologer_id));`);
    await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), actor_id UUID REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(100) NOT NULL, details TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_astrologer_id ON appointments(astrologer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_birth_profiles_client_id ON client_birth_profiles(client_id);`);
    logger.info('Database migrations completed successfully');
  } finally {
    client.release();
  }
};

export default pool;
