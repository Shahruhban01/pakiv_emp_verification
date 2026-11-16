const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const { generalApiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust reverse proxy headers (Cloudflare, Nginx, Render, Railway, etc.)
app.set('trust proxy', 1);

// Security HTTP headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', '*'],
        connectSrc: ["'self'", 'https:', '*'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        config.corsOrigins.includes(origin) ||
        origin.endsWith('.pakiv.com') ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or specify strict origins
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookieSecret));

// Mount API with rate limiting
app.use('/api', generalApiLimiter);
app.use('/api/v1', routes);

// Serve static frontend files
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Clean URL rewrites for static pages
app.get('/verifyemp', (req, res) => {
  res.sendFile(path.join(frontendPath, 'verifyemp/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/login.html'));
});

app.get('/admin/employees', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/employees.html'));
});

app.get('/admin/employee-form', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/employee-form.html'));
});

// Fallback to 404 for API, or index.html for frontend root
app.use('/api/*', notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

module.exports = app;

