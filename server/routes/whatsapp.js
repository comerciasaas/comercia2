const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authMiddleware } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Estatísticas do WhatsApp
router.get('/stats', whatsappController.getStats);

// Todas as sessões
router.get('/sessions', 
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('status').optional().isIn(['active', 'inactive', 'closed'])
  ],
  handleValidationErrors,
  whatsappController.getAllSessions
);

// Sessões ativas
router.get('/sessions/active', 
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('agentId').optional().isUUID()
  ],
  handleValidationErrors,
  whatsappController.getActiveSessions
);

// Sessões que precisam de atenção
router.get('/sessions/stale',
  [
    query('minutesThreshold').optional().isInt({ min: 1, max: 1440 })
  ],
  handleValidationErrors,
  whatsappController.getStaleSessions
);

// Atribuir agente a sessão
router.post('/sessions/:sessionId/assign',
  [
    param('sessionId').isUUID(),
    body('agentId').isUUID()
  ],
  handleValidationErrors,
  whatsappController.assignAgent
);

// Transferir sessão entre agentes
router.post('/sessions/:sessionId/transfer',
  [
    param('sessionId').isUUID(),
    body('newAgentId').isUUID(),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  handleValidationErrors,
  whatsappController.transferSession
);

// Encerrar sessão
router.post('/sessions/:sessionId/close',
  [
    param('sessionId').isUUID(),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  handleValidationErrors,
  whatsappController.closeSession
);

// Enviar mensagem
router.post('/send-message',
  [
    body('phoneNumber')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Número de telefone inválido'),
    body('message')
      .isString()
      .isLength({ min: 1, max: 4096 })
      .withMessage('Mensagem deve ter entre 1 e 4096 caracteres'),
    body('messageType')
      .optional()
      .isIn(['text', 'image', 'document', 'audio'])
      .withMessage('Tipo de mensagem inválido'),
    body('mediaUrl')
      .optional()
      .isURL()
      .withMessage('URL de mídia inválida')
  ],
  handleValidationErrors,
  whatsappController.sendMessage
);

// Histórico de conversa
router.get('/conversations/:phoneNumber/history',
  [
    param('phoneNumber').matches(/^\+?[1-9]\d{1,14}$/),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  whatsappController.getConversationHistory
);

// Relatório de performance
router.get('/reports/performance',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('agentId').optional().isUUID()
  ],
  handleValidationErrors,
  whatsappController.getPerformanceReport
);

module.exports = router;