const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { 
  sanitizeInput, 
  errorHandler, 
  notFoundHandler, 
  apiRateLimit 
} = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const adminRoutes = require('./routes/admin');
const conversationRoutes = require('./routes/conversations');
const chatRoutes = require('./routes/chat');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    error: 'Muitas tentativas. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Input sanitization
app.use(sanitizeInput);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// API Rate limiting
app.use('/api/', apiRateLimit);

// Serve admin panel static files
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Make io available to routes
app.set('io', io);

// 404 handler
app.use('*', notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('❌ Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.log('⚠️  Starting server without database connection');
      console.log('📝 Please check your database configuration in .env file');
    }
    
    server.listen(PORT, () => {
      console.log('\n🚀 ===================================');
      console.log(`🚀 AI Agents SaaS Server Running`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 ===================================`);
      console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
      console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend: http://localhost:5173`);
      console.log('🚀 ===================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };