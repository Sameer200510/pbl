const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xssSanitize = require('./middlewares/xssMiddleware');
const hpp = require('hpp');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Trust proxy for AWS Load Balancer so rate limiting uses actual client IP
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for React dev in some cases, but try to restrict in prod
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5173", "http://localhost:5174"]
    }
  },
  crossOriginEmbedderPolicy: false, // Prevents loading some external assets if true
}));
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('vercel.app') || process.env.FRONTEND_URL === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Global Rate Limiting (Anti-DDoS, but generous enough for 5000 university students on NAT)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use(limiter);

// Body Parsers with strict size limits to prevent large payload attacks
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data Sanitization against Cross-Site Scripting (XSS)
app.use(xssSanitize());

// Prevent HTTP Parameter Pollution (Disabled due to IncomingMessage query getter conflict)
// app.use(hpp());

// Serve static files (uploaded documents)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/integrations', require('./routes/integrationRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'PBL Management System API is running.' });
});

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
