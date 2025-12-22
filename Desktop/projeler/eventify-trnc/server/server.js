require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded from API
})); // Security headers
app.use(morgan('dev')); // Logging
// CORS Configuration - Support both local and Vercel deployments
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
  'http://localhost:3000', 
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:3000'
];

// Add Vercel preview and production domains if not already included
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.VERCEL) {
  // Vercel automatically sets this, add common patterns
  const vercelDomain = process.env.VERCEL_URL || '';
  if (vercelDomain && !allowedOrigins.includes(`https://${vercelDomain}`)) {
    allowedOrigins.push(`https://${vercelDomain}`);
  }
}

// Allow all Vercel preview deployments (for development)
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    })) {
      callback(null, true);
    } else {
      // In development, be more permissive
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CORS] Allowing origin in dev mode: ${origin}`);
        callback(null, true);
      } else {
        console.log(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Eventify TRNC API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// Start Server (only if not running as Vercel serverless function)
// Vercel serverless functions don't need app.listen()
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;

