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

export default pool;
