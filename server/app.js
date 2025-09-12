const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
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
const whatsappRoutes = require('./routes/whatsapp');
const transferRoutes = require('./routes/transfers');
const whatsappWebhookRoutes = require('./webhooks/whatsapp');

const app = express();
const server = http.createServer(app);

// Socket.IO setup for real-time features
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
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Cache control headers
app.use((req, res, next) => {
  if (req.method === 'GET' && req.url.includes('/api/')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

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
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
  message: {
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

// Body parsing middleware with compression
const compression = require('compression');
app.use(compression());

app.use(express.json({ 
  limit: '5mb', // Reduced from 10mb for better security
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'JSON inválido'
      });
      return;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Input sanitization
app.use(sanitizeInput);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Add request metadata
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(7);
  req.timestamp = new Date();
  next();
});

// API Rate limiting (more specific than general limiter)
app.use('/api/', apiRateLimit);

// Serve admin panel static files
const path = require('path');
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/setup', require('./routes/setup'));
app.use('/webhooks/whatsapp', whatsappWebhookRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'AI Agents SaaS API',
    version: '1.0.0',
    description: 'API para plataforma SaaS de Agentes de IA',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login do usuário',
        'POST /api/auth/register': 'Registro de usuário',
        'GET /api/auth/profile': 'Perfil do usuário',
        'PUT /api/auth/profile': 'Atualizar perfil'
      },
      agents: {
        'GET /api/agents': 'Listar agentes',
        'POST /api/agents': 'Criar agente',
        'GET /api/agents/:id': 'Obter agente',
        'PUT /api/agents/:id': 'Atualizar agente',
        'DELETE /api/agents/:id': 'Deletar agente'
      },
      admin: {
        'GET /api/admin/dashboard': 'Dashboard administrativo',
        'GET /api/admin/users': 'Listar usuários',
        'GET /api/admin/agents': 'Listar todos os agentes',
        'GET /api/admin/conversations': 'Listar conversas',
        'GET /api/admin/audit-logs': 'Logs de auditoria',
        'GET /api/admin/alerts': 'Alertas do sistema'
      }
    }
  });
});

// Initialize Socket Service for real-time events
const SocketService = require('./services/socketService');
const socketService = new SocketService(io);

// Make socketService available to routes
app.set('socketService', socketService);

// Make io available to routes
app.set('io', io);

// 404 handler (must come before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
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
      console.log(`📊 Admin Panel: http://localhost:${PORT}/api/admin/dashboard`);
      console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
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