const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const crypto = require('crypto');

// Rate limiting para webhook
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto por IP
  message: { error: 'Muitas tentativas. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para IPs do Facebook/Meta
    const facebookIPs = [
      '31.13.24.0/21',
      '31.13.64.0/18',
      '66.220.144.0/20',
      '69.63.176.0/20',
      '69.171.224.0/19',
      '74.119.76.0/22',
      '103.4.96.0/22',
      '173.252.64.0/18',
      '204.15.20.0/22'
    ];
    
    const clientIP = req.ip || req.connection.remoteAddress;
    return facebookIPs.some(range => {
      // Implementação básica - em produção usar biblioteca como 'ip-range-check'
      return clientIP.startsWith(range.split('/')[0].substring(0, 10));
    });
  }
});

// Middleware de validação de segurança
const securityMiddleware = (req, res, next) => {
  const timestamp = Date.now();
  const userAgent = req.get('User-Agent') || '';
  const contentType = req.get('Content-Type') || '';
  
  // Log de segurança
  console.log('Webhook Security Check:', {
    ip: req.ip,
    userAgent: userAgent.substring(0, 100),
    contentType,
    timestamp,
    method: req.method,
    path: req.path
  });
  
  // Validar User-Agent (Facebook envia um UA específico)
  if (req.method === 'POST' && !userAgent.includes('facebookexternalua')) {
    console.warn('Suspicious User-Agent detected:', userAgent);
  }
  
  // Validar Content-Type para POST
  if (req.method === 'POST' && !contentType.includes('application/json')) {
    return res.status(400).json({ error: 'Content-Type inválido' });
  }
  
  next();
};

// Aplicar middlewares de segurança
router.use(webhookLimiter);
router.use(securityMiddleware);

// Verificação do webhook (GET)
router.get('/', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Verificação do webhook WhatsApp:', { mode, token });

    const result = whatsappService.verifyWebhook(mode, token, challenge);
    
    if (result) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('Erro na verificação do webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Receber mensagens do WhatsApp (POST)
router.post('/', async (req, res) => {
  const startTime = Date.now();
  let processingError = null;
  
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const socketService = req.app.get('socketService');
    const requestId = crypto.randomUUID();

    // Log detalhado do webhook recebido
    console.log(`[${requestId}] Webhook recebido:`, {
      signature: signature ? 'presente' : 'ausente',
      payloadSize: payload.length,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    // Validações de segurança obrigatórias
    if (!signature) {
      console.error(`[${requestId}] Webhook rejeitado: assinatura ausente`);
      return res.status(401).json({ error: 'Assinatura obrigatória' });
    }

    // Validar tamanho do payload
    if (payload.length > 50000) { // 50KB max
      console.error(`[${requestId}] Webhook rejeitado: payload muito grande (${payload.length} bytes)`);
      return res.status(413).json({ error: 'Payload muito grande' });
    }

    // Validar estrutura básica do webhook
    if (!req.body.entry || !Array.isArray(req.body.entry)) {
      console.error(`[${requestId}] Webhook rejeitado: estrutura inválida`);
      return res.status(400).json({ error: 'Estrutura de webhook inválida' });
    }

    // Validar assinatura
    if (!whatsappService.validateSignature(payload, signature)) {
      console.error(`[${requestId}] Webhook rejeitado: assinatura inválida`);
      // Log para análise de segurança
      console.error('Security Alert:', {
        requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        signatureProvided: signature,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    // Processar mensagem com timeout
    const processingPromise = whatsappService.processIncomingMessage(req.body, socketService);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout no processamento')), 10000); // 10s timeout
    });

    await Promise.race([processingPromise, timeoutPromise]);
    
    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Webhook processado com sucesso em ${processingTime}ms`);
    
    res.status(200).send('OK');
  } catch (error) {
    processingError = error;
    const processingTime = Date.now() - startTime;
    console.error(`Erro ao processar webhook (${processingTime}ms):`, {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).send('Internal Server Error');
  }
});

// Middleware de autenticação para endpoints internos
const authenticateInternal = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  // Verificar se tem token JWT ou API key
  if (!authHeader && !apiKey) {
    return res.status(401).json({ error: 'Token de autenticação obrigatório' });
  }
  
  // Validar API key se fornecida
  if (apiKey && apiKey !== process.env.INTERNAL_API_KEY) {
    console.warn('Tentativa de acesso com API key inválida:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  next();
};

// Endpoint para enviar mensagens (para uso interno)
router.post('/send', authenticateInternal, async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;

    // Validações de entrada mais rigorosas
    if (!to || typeof to !== 'string' || !to.match(/^\d{10,15}$/)) {
      return res.status(400).json({ error: 'Número de telefone inválido (deve conter 10-15 dígitos)' });
    }

    if (!message || typeof message !== 'string' || message.length > 4096) {
      return res.status(400).json({ error: 'Mensagem inválida (máximo 4096 caracteres)' });
    }

    if (!['text', 'image', 'document', 'audio', 'video'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de mensagem inválido' });
    }

    const result = await whatsappService.sendMessage(to, message, type);
    
    // Log da operação
    console.log('Mensagem enviada via API:', {
      to: to.substring(0, 5) + '***',
      type,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', {
      error: error.message,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Endpoint para obter conversas ativas
router.get('/conversations', authenticateInternal, async (req, res) => {
  try {
    const db = require('../config/database');
    const { limit = 50, offset = 0, status = 'active' } = req.query;
    
    // Validar parâmetros
    if (isNaN(limit) || isNaN(offset) || limit > 100) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    
    const [conversations] = await db.execute(`
      SELECT 
        c.*,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.status = ?
      GROUP BY c.id
      ORDER BY last_message_at DESC
      LIMIT ? OFFSET ?
    `, [status, parseInt(limit), parseInt(offset)]);

    res.json({
      conversations,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conversas:', {
      error: error.message,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

// Endpoint para obter mensagens de uma conversa
router.get('/conversations/:id/messages', authenticateInternal, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const db = require('../config/database');
    
    // Validar parâmetros
    if (!id || isNaN(id) || isNaN(limit) || isNaN(offset) || limit > 500) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    
    const [messages] = await db.execute(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `, [parseInt(id), parseInt(limit), parseInt(offset)]);

    res.json({
      messages,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        conversationId: parseInt(id)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', {
      error: error.message,
      conversationId: req.params.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Endpoint para atualizar status da conversa
router.patch('/conversations/:id/status', authenticateInternal, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = require('../config/database');
    
    // Validar parâmetros
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID da conversa inválido' });
    }
    
    if (!status || !['active', 'closed', 'pending', 'transferred'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const [result] = await db.execute(
      'UPDATE conversations SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, parseInt(id)]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    console.log('Status da conversa atualizado:', {
      conversationId: parseInt(id),
      newStatus: status,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, conversationId: parseInt(id), status });
  } catch (error) {
    console.error('Erro ao atualizar status:', {
      error: error.message,
      conversationId: req.params.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Endpoint para estatísticas do WhatsApp
router.get('/stats', authenticateInternal, async (req, res) => {
  try {
    const db = require('../config/database');
    const { period = '24h' } = req.query;
    
    // Validar período
    const validPeriods = ['1h', '24h', '7d', '30d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Período inválido. Use: 1h, 24h, 7d, 30d' });
    }
    
    const intervalMap = {
      '1h': '1 HOUR',
      '24h': '24 HOUR',
      '7d': '7 DAY',
      '30d': '30 DAY'
    };
    
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_conversations,
        COUNT(DISTINCT CASE WHEN c.status = 'closed' THEN c.id END) as closed_conversations,
        COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_conversations,
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.sender = 'user' THEN 1 END) as inbound_messages,
        COUNT(CASE WHEN m.sender = 'agent' THEN 1 END) as outbound_messages,
        COUNT(CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL ${intervalMap[period]}) THEN 1 END) as messages_period,
        AVG(CASE WHEN c.status = 'closed' THEN TIMESTAMPDIFF(MINUTE, c.created_at, c.updated_at) END) as avg_resolution_time_minutes
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
    `);

    const result = {
      ...stats[0],
      period,
      generated_at: new Date().toISOString(),
      response_time_avg: stats[0].avg_resolution_time_minutes ? `${Math.round(stats[0].avg_resolution_time_minutes)} min` : null
    };
    
    delete result.avg_resolution_time_minutes;

    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', {
      error: error.message,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;