require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

// In production, JWT secrets must be explicitly configured
if (nodeEnv === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
  }
}

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv,

  // Database
  databaseUrl: process.env.DATABASE_URL,
  pgHost: process.env.PG_HOST || 'localhost',
  pgPort: parseInt(process.env.PG_PORT, 10) || 5432,
  pgUser: process.env.PG_USER || 'postgres',
  pgPassword: process.env.PG_PASSWORD || 'password',
  pgDatabase: process.env.PG_DATABASE || 'medical_appointments',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Email
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@clinica.com',

  // File uploads. On serverless (Vercel) the only writable location is /tmp, so
  // default there; note that /tmp is ephemeral (uploads do not persist between
  // invocations). A production deployment should use object storage (S3/Blob).
  uploadDir: process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : './uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880,

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
};

module.exports = env;
