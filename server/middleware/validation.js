const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Middleware para capturar e formatar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validações para autenticação
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email muito longo'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Senha deve ter entre 6 e 128 caracteres')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos 1 letra e 1 número'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Nome da empresa muito longo'),
  
  body('plan')
    .optional()
    .isIn(['free', 'basic', 'pro', 'enterprise'])
    .withMessage('Plano deve ser: free, basic, pro ou enterprise'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  handleValidationErrors
];

const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email muito longo'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Nome da empresa muito longo'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\(\)\+\-]+$/)
    .withMessage('Telefone deve conter apenas números e caracteres válidos'),
  
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('Nova senha deve ter entre 6 e 128 caracteres')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos 1 letra e 1 número'),
  
  handleValidationErrors
];

// Validações para agentes
const validateAgent = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do agente deve ter entre 2 e 100 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição muito longa (máximo 500 caracteres)'),
  
  body('ai_provider')
    .isIn(['chatgpt', 'gemini', 'huggingface', 'claude'])
    .withMessage('Provedor de IA deve ser: chatgpt, gemini, huggingface ou claude'),
  
  body('model')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Modelo é obrigatório e deve ter no máximo 100 caracteres'),
  
  body('api_key')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Chave da API deve ter entre 10 e 500 caracteres'),
  
  body('system_prompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Prompt do sistema muito longo (máximo 2000 caracteres)'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperatura deve estar entre 0 e 2'),
  
  body('max_tokens')
    .optional()
    .isInt({ min: 1, max: 8000 })
    .withMessage('Máximo de tokens deve estar entre 1 e 8000'),
  
  handleValidationErrors
];

// Validações para conversas
const validateConversation = [
  body('agent_id')
    .isUUID()
    .withMessage('ID do agente deve ser um UUID válido'),
  
  body('channel_type')
    .optional()
    .isIn(['web', 'whatsapp', 'telegram', 'api'])
    .withMessage('Tipo de canal deve ser: web, whatsapp, telegram ou api'),
  
  body('context')
    .optional()
    .isObject()
    .withMessage('Contexto deve ser um objeto JSON válido'),
  
  handleValidationErrors
];

const validateMessage = [
  body('conversation_id')
    .isUUID()
    .withMessage('ID da conversa deve ser um UUID válido'),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Mensagem deve ter entre 1 e 5000 caracteres'),
  
  body('sender_type')
    .isIn(['user', 'agent'])
    .withMessage('Tipo do remetente deve ser: user ou agent'),
  
  handleValidationErrors
];

// Validações para parâmetros de URL
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  
  handleValidationErrors
];

// Validações para queries de paginação
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Página deve ser um número entre 1 e 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Termo de busca muito longo'),
  
  handleValidationErrors
];

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limits específicos
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  5, // 5 tentativas
  'Muitas tentativas de login. Tente novamente em 15 minutos.'
);

const apiRateLimit = createRateLimit(
  60 * 1000, // 1 minuto
  100, // 100 requests
  'Muitas requisições. Tente novamente em 1 minuto.'
);

const messageRateLimit = createRateLimit(
  60 * 1000, // 1 minuto
  30, // 30 mensagens
  'Muitas mensagens enviadas. Tente novamente em 1 minuto.'
);

// Sanitização de dados
const sanitizeInput = (req, res, next) => {
  // Remove caracteres perigosos de strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

// Middleware de tratamento de erros global
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erro de validação do Joi ou express-validator
  if (err.name === 'ValidationError' || err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: err.details || err.errors
    });
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Erro de banco de dados
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Registro já existe'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referência inválida'
    });
  }

  // Erro de rate limit
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: err.retryAfter
    });
  }

  // Erro de arquivo muito grande
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Arquivo muito grande'
    });
  }

  // Erro de sintaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido'
    });
  }

  // Erro genérico do servidor
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Middleware para capturar rotas não encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.path} não encontrada`
  });
};

module.exports = {
  // Validações
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateAgent,
  validateAgentUpdate: validateAgent, // Reutiliza a mesma validação
  validateConversation,
  validateMessage,
  validateUUID,
  validatePagination,
  handleValidationErrors,
  
  // Rate limiting
  authRateLimit,
  apiRateLimit,
  messageRateLimit,
  createRateLimit,
  
  // Sanitização e tratamento de erros
  sanitizeInput,
  errorHandler,
  notFoundHandler
};