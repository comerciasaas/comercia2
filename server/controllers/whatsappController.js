const WhatsAppSession = require('../models/WhatsAppSession');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Agent = require('../models/Agent');
const WhatsAppService = require('../services/whatsappService');
const { pool } = require('../config/database');

const whatsappController = {
  // Obter estatísticas do WhatsApp em tempo real
  async getStats(req, res) {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(CASE WHEN ws.status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN ws.created_at >= NOW() - INTERVAL 24 HOUR THEN 1 END) as sessions_24h,
          COUNT(CASE WHEN c.channel_type = 'whatsapp' AND c.status = 'active' THEN 1 END) as active_conversations,
          COUNT(CASE WHEN m.created_at >= NOW() - INTERVAL 1 HOUR AND c.channel_type = 'whatsapp' THEN 1 END) as messages_1h,
          AVG(CASE WHEN m.response_time IS NOT NULL AND c.channel_type = 'whatsapp' THEN m.response_time END) as avg_response_time,
          COUNT(CASE WHEN c.channel_type = 'whatsapp' AND c.satisfaction_rating >= 4 THEN 1 END) as satisfied_customers
        FROM whatsapp_sessions ws
        LEFT JOIN conversations c ON c.customer_phone = ws.phone_number
        LEFT JOIN messages m ON m.conversation_id = c.id AND m.sender = 'agent'
      `);

      // Estatísticas por agente
      const [agentStats] = await pool.execute(`
        SELECT 
          a.id,
          a.name,
          COUNT(CASE WHEN ws.status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN c.status = 'completed' AND c.updated_at >= NOW() - INTERVAL 24 HOUR THEN 1 END) as completed_24h,
          AVG(CASE WHEN m.response_time IS NOT NULL THEN m.response_time END) as avg_response_time,
          AVG(CASE WHEN c.satisfaction_rating IS NOT NULL THEN c.satisfaction_rating END) as avg_satisfaction
        FROM agents a
        LEFT JOIN whatsapp_sessions ws ON ws.agent_id = a.id
        LEFT JOIN conversations c ON c.agent_id = a.id AND c.channel_type = 'whatsapp'
        LEFT JOIN messages m ON m.conversation_id = c.id AND m.sender = 'agent'
        WHERE a.is_active = true
        GROUP BY a.id, a.name
        ORDER BY active_sessions DESC
      `);

      // Distribuição de mensagens por hora (últimas 24h)
      const [hourlyDistribution] = await pool.execute(`
        SELECT 
          HOUR(m.created_at) as hour,
          COUNT(*) as message_count,
          COUNT(CASE WHEN m.sender = 'user' THEN 1 END) as inbound_count,
          COUNT(CASE WHEN m.sender = 'agent' THEN 1 END) as outbound_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.channel_type = 'whatsapp' 
        AND m.created_at >= NOW() - INTERVAL 24 HOUR
        GROUP BY HOUR(m.created_at)
        ORDER BY hour
      `);

      res.json({
        success: true,
        stats: {
          overview: stats[0],
          agents: agentStats,
          hourlyDistribution
        }
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Obter todas as sessões ativas
  async getActiveSessions(req, res) {
    try {
      const { limit = 50, offset = 0, agentId } = req.query;
      
      let sessions;
      if (agentId) {
        sessions = await WhatsAppSession.findByAgent(agentId);
      } else {
        sessions = await WhatsAppSession.findActive();
      }

      // Aplicar paginação
      const paginatedSessions = sessions.slice(offset, offset + parseInt(limit));
      
      // Enriquecer com dados de conversas
      const enrichedSessions = await Promise.all(
        paginatedSessions.map(async (session) => {
          const stats = await session.getStats();
          return {
            ...session.toJSON(),
            stats
          };
        })
      );

      res.json({
        success: true,
        sessions: enrichedSessions,
        pagination: {
          total: sessions.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Erro ao obter sessões ativas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Obter todas as sessões (com filtros opcionais)
  async getAllSessions(req, res) {
    try {
      const { limit = 50, offset = 0, status } = req.query;
      
      let query = `
        SELECT 
          ws.*,
          a.name as agent_name,
          COUNT(m.id) as message_count,
          MAX(m.created_at) as last_message_at
        FROM whatsapp_sessions ws
        LEFT JOIN agents a ON ws.agent_id = a.id
        LEFT JOIN conversations c ON c.customer_phone = ws.phone_number
        LEFT JOIN messages m ON m.conversation_id = c.id
      `;
      
      const params = [];
      
      if (status) {
        query += ' WHERE ws.status = ?';
        params.push(status);
      }
      
      query += `
        GROUP BY ws.id
        ORDER BY ws.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      const [sessions] = await pool.execute(query, params);
      
      // Contar total para paginação
      let countQuery = 'SELECT COUNT(*) as total FROM whatsapp_sessions ws';
      const countParams = [];
      
      if (status) {
        countQuery += ' WHERE ws.status = ?';
        countParams.push(status);
      }
      
      const [countResult] = await pool.execute(countQuery, countParams);
      
      res.json({
        success: true,
        sessions,
        pagination: {
          total: countResult[0].total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Erro ao obter todas as sessões:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atribuir agente a uma sessão
  async assignAgent(req, res) {
    try {
      const { sessionId } = req.params;
      const { agentId } = req.body;

      const session = await WhatsAppSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      const agent = await Agent.findById(agentId);
      if (!agent || !agent.is_active) {
        return res.status(400).json({ error: 'Agente inválido ou inativo' });
      }

      await session.assignAgent(agentId);

      res.json({
        success: true,
        message: 'Agente atribuído com sucesso',
        session: session.toJSON()
      });
    } catch (error) {
      console.error('Erro ao atribuir agente:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Transferir sessão entre agentes
  async transferSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { newAgentId, reason } = req.body;

      const session = await WhatsAppSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      const newAgent = await Agent.findById(newAgentId);
      if (!newAgent || !newAgent.is_active) {
        return res.status(400).json({ error: 'Novo agente inválido ou inativo' });
      }

      await session.transfer(newAgentId, reason);

      res.json({
        success: true,
        message: 'Sessão transferida com sucesso',
        session: session.toJSON()
      });
    } catch (error) {
      console.error('Erro ao transferir sessão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Encerrar sessão
  async closeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;

      const session = await WhatsAppSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      await session.close(reason || 'manual');

      res.json({
        success: true,
        message: 'Sessão encerrada com sucesso',
        session: session.toJSON()
      });
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Enviar mensagem via WhatsApp
  async sendMessage(req, res) {
    try {
      const { phoneNumber, message, messageType = 'text', mediaUrl } = req.body;
      const agentId = req.userId;

      // Verificar se existe sessão ativa
      let session = await WhatsAppSession.findByPhoneNumber(phoneNumber);
      
      if (!session) {
        // Criar nova sessão se não existir
        session = await WhatsAppSession.create({
          phoneNumber,
          agentId,
          contactName: phoneNumber // Será atualizado quando recebermos o nome
        });
      }

      // Enviar mensagem via WhatsApp API
      const whatsappService = new WhatsAppService();
      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        type: messageType,
        text: messageType === 'text' ? { body: message } : undefined,
        image: messageType === 'image' ? { link: mediaUrl } : undefined,
        document: messageType === 'document' ? { link: mediaUrl } : undefined
      });

      // Salvar mensagem no banco
      const conversation = await Conversation.findByPhoneNumber(phoneNumber) || 
        await Conversation.create({
          phone_number: phoneNumber,
          agent_id: agentId,
          channel: 'whatsapp',
          status: 'active'
        });

      await Message.create({
        conversation_id: conversation.id,
        content: message,
        direction: 'outbound',
        message_type: messageType,
        media_url: mediaUrl,
        whatsapp_message_id: result.messageId
      });

      // Atualizar última atividade da sessão
      await session.updateLastActivity();

      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        messageId: result.messageId
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  },

  // Obter histórico de conversas
  async getConversationHistory(req, res) {
    try {
      const { phoneNumber } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const conversation = await Conversation.findByPhoneNumber(phoneNumber);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversa não encontrada' });
      }

      const messages = await Message.findByConversationId(
        conversation.id, 
        parseInt(limit), 
        parseInt(offset)
      );

      res.json({
        success: true,
        conversation,
        messages,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Obter sessões que precisam de atenção
  async getStaleSessions(req, res) {
    try {
      const { minutesThreshold = 30 } = req.query;
      
      const staleSessions = await WhatsAppSession.findStale(parseInt(minutesThreshold));
      
      const enrichedSessions = await Promise.all(
        staleSessions.map(async (session) => {
          const stats = await session.getStats();
          return {
            ...session.toJSON(),
            stats,
            minutesInactive: Math.floor(
              (new Date() - new Date(session.lastActivity)) / (1000 * 60)
            )
          };
        })
      );

      res.json({
        success: true,
        sessions: enrichedSessions
      });
    } catch (error) {
      console.error('Erro ao obter sessões inativas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Relatório de performance por período
  async getPerformanceReport(req, res) {
    try {
      const { startDate, endDate, agentId } = req.query;
      
      let whereClause = "WHERE c.channel = 'whatsapp'";
      const params = [];
      
      if (startDate && endDate) {
        whereClause += " AND c.created_at BETWEEN ? AND ?";
        params.push(startDate, endDate);
      }
      
      if (agentId) {
        whereClause += " AND c.agent_id = ?";
        params.push(agentId);
      }

      const [report] = await pool.execute(`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_conversations,
          COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_conversations,
          AVG(CASE WHEN c.satisfaction_rating IS NOT NULL THEN c.satisfaction_rating END) as avg_satisfaction,
          AVG(CASE WHEN c.resolution_time IS NOT NULL THEN c.resolution_time END) as avg_resolution_time,
          COUNT(CASE WHEN c.satisfaction_rating >= 4 THEN 1 END) as satisfied_customers,
          COUNT(DISTINCT c.phone_number) as unique_customers,
          SUM((
            SELECT COUNT(*) FROM messages m 
            WHERE m.conversation_id = c.id AND m.sender = 'user'
          )) as total_inbound_messages,
          SUM((
            SELECT COUNT(*) FROM messages m 
            WHERE m.conversation_id = c.id AND m.sender = 'agent'
          )) as total_outbound_messages
        FROM conversations c
        ${whereClause}
      `, params);

      // Distribuição por dia
      const [dailyDistribution] = await pool.execute(`
        SELECT 
          DATE(c.created_at) as date,
          COUNT(*) as conversations,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed,
          AVG(CASE WHEN c.satisfaction_rating IS NOT NULL THEN c.satisfaction_rating END) as avg_satisfaction
        FROM conversations c
        ${whereClause}
        GROUP BY DATE(c.created_at)
        ORDER BY date
      `, params);

      res.json({
        success: true,
        report: {
          summary: report[0],
          dailyDistribution
        }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = whatsappController;