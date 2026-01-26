const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');

// Use mock services for development
const database = require('./config/mockDatabase');
const redis = require('./config/mockRedis');

const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const translationRoutes = require('./routes/translationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Added unsafe-eval for debugging
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

// Compression and parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'mock',
      redis: 'mock',
      translation: 'available'
    }
  });
});

// API routes
app.use('/api/translation', translationRoutes);

// Demo API endpoints for testing
app.get('/api/demo/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      supported: ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'],
      names: {
        'hi': 'हिंदी',
        'te': 'తెలుగు',
        'ta': 'தமிழ்',
        'kn': 'ಕನ್ನಡ',
        'bn': 'বাংলা',
        'mr': 'मराठी',
        'en': 'English'
      }
    }
  });
});

app.post('/api/demo/user', (req, res) => {
  const { language, role } = req.body;
  res.json({
    success: true,
    data: {
      userId: `demo-user-${Date.now()}`,
      language,
      role,
      message: 'Demo user created successfully'
    }
  });
});

// Serve static files for PWA
app.use(express.static('public'));

// Catch-all handler for PWA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to mock services
    await database.connectDatabase();
    await redis.connectRedis();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Multilingual Mandi Development Server running on port ${PORT}`);
      logger.info(`🌐 Open http://localhost:${PORT} to view the application`);
      logger.info(`📱 PWA features available for mobile testing`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`💾 Using mock database and Redis for development`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start development server:', error);
    process.exit(1);
  }
}

// Start the development server
startServer();

module.exports = app;