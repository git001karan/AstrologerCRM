import winston from 'winston';

// Configure levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format: JSON for production/file, clean string for development if desired.
// Here we strictly follow the enterprise requirement of structured JSON logs.
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }), // capture stack traces if an Error object is passed
  winston.format.json()
);

const transports = [
  new winston.transports.Console()
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

export default logger;
