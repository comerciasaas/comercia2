const express = require('express');
const router = express.Router();
const transferService = require('../services/transferService');
const { authMiddleware } = require('../middleware/auth');
const socketService = require('../services/socketService');

// Middleware para autenticação em todas as rotas
router.use(authMiddleware);

// Transferir conversa para outro agente
router.post('/conversations/:id/transfer', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { toAgentId, reason, notes } = req.body;
    const fromAgentId = req.user.id;

    // Validações
    if (!toAgentId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Agente de destino e motivo são obrigatórios'
      });
    }

    // Validar se a transferência é possível
    const validation = await transferService.validateTransfer(
      conversationId, 
      fromAgentId, 
      toAgentId
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Transferência inválida',
        errors: validation.errors
      });
    }

    // Executar transferência
    const result = await transferService.transferConversation(
      conversationId,
      fromAgentId,
      toAgentId,
      reason,
      notes,
      socketService
    );

    res.json(result);

  } catch (error) {
    console.error('Erro ao transferir conversa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Buscar agentes disponíveis para transferência
router.get('/agents/available', async (req, res) => {
  try {
    const currentAgentId = req.user.id;
    const { specialization } = req.query;

    const agents = await transferService.getAvailableAgents(
      currentAgentId, 
      specialization
    );

    res.json({
      success: true,
      agents
    });

  } catch (error) {
    console.error('Erro ao buscar agentes disponíveis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Transferência automática por carga de trabalho
router.post('/conversations/:id/auto-transfer', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const currentAgentId = req.user.id;

    // Verificar se o usuário é supervisor ou admin
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas supervisores podem fazer transferências automáticas'
      });
    }

    const result = await transferService.autoTransferByWorkload(
      conversationId,
      currentAgentId,
      socketService
    );

    res.json(result);

  } catch (error) {
    console.error('Erro na transferência automática:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Transferir para especialista
router.post('/conversations/:id/transfer-specialist', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { specialization, notes } = req.body;
    const currentAgentId = req.user.id;

    if (!specialization) {
      return res.status(400).json({
        success: false,
        message: 'Especialização é obrigatória'
      });
    }

    const result = await transferService.transferToSpecialist(
      conversationId,
      currentAgentId,
      specialization,
      notes,
      socketService
    );

    res.json(result);

  } catch (error) {
    console.error('Erro ao transferir para especialista:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Buscar histórico de transferências de uma conversa
router.get('/conversations/:id/history', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    const history = await transferService.getTransferHistory(conversationId);

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Erro ao buscar histórico de transferências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Estatísticas de transferências
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d', agentId } = req.query;
    
    // Se não for admin/supervisor, só pode ver suas próprias estatísticas
    const targetAgentId = ['admin', 'supervisor'].includes(req.user.role) 
      ? agentId 
      : req.user.id;

    const stats = await transferService.getTransferStats(targetAgentId, period);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de transferência:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Buscar especializações disponíveis
router.get('/specializations', async (req, res) => {
  try {
    const db = require('../config/database');
    const [specializations] = await db.execute(
      'SELECT * FROM specializations ORDER BY name'
    );

    res.json({
      success: true,
      specializations
    });

  } catch (error) {
    console.error('Erro ao buscar especializações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Atualizar especialização do agente
router.put('/agent/specialization', async (req, res) => {
  try {
    const { specialization, maxConversations } = req.body;
    const agentId = req.user.id;

    // Verificar se é agente
    if (req.user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        message: 'Apenas agentes podem atualizar especialização'
      });
    }

    const db = require('../config/database');
    
    let query = 'UPDATE users SET ';
    const params = [];
    const updates = [];

    if (specialization !== undefined) {
      updates.push('specialization = ?');
      params.push(specialization);
    }

    if (maxConversations !== undefined) {
      updates.push('max_conversations = ?');
      params.push(parseInt(maxConversations));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(agentId);

    await db.execute(query, params);

    res.json({
      success: true,
      message: 'Especialização atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar especialização:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Middleware de tratamento de erros
router.use((error, req, res, next) => {
  console.error('Erro nas rotas de transferência:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

module.exports = router;