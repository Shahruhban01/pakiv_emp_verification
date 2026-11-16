const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  appName: process.env.APP_NAME || 'Pakiv Employee Verification Portal',
  
  // URLs
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5000',
  publicVerifyBaseUrl: process.env.PUBLIC_VERIFY_BASE_URL || 'http://localhost:5000/verifyemp',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5000,http://127.0.0.1:5000,https://employees.pakiv.com')
    .split(',')
    .map(o => o.trim()),

  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pakiv_emp_verification',

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'pakiv_dev_jwt_secret_fallback_2026',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'pakiv_dev_refresh_secret_fallback_2026',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'pakiv_cookie_secret_key_2026',

  // Cloudflare R2
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'pakiv-employee-assets',
    publicUrl: process.env.R2_PUBLIC_URL || '',
    isConfigured() {
      return Boolean(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucketName);
    }
  },

  // Seed Admin
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@pakiv.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'PakivAdmin2026!Secure',
    name: process.env.DEFAULT_ADMIN_NAME || 'Pakiv Super Admin'
  }
};

module.exports = config;

