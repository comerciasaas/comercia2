const db = require('../config/database');
const whatsappService = require('./whatsappService');

class TransferService {
  constructor() {
    this.transferReasons = {
      ESCALATION: 'Escalação para supervisor',
      SPECIALIZATION: 'Transferência para especialista',
      WORKLOAD: 'Redistribuição de carga de trabalho',
      UNAVAILABLE: 'Agente indisponível',
      CUSTOMER_REQUEST: 'Solicitação do cliente',
      TECHNICAL: 'Questão técnica específica'
    };
  }

  // Transferir conversa para outro agente
  async transferConversation(conversationId, fromAgentId, toAgentId, reason, notes = '', socketService = null) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verificar se a conversa existe e pertence ao agente atual
      const [conversations] = await connection.execute(
        'SELECT * FROM conversations WHERE id = ? AND agent_id = ?',
        [conversationId, fromAgentId]
      );

      if (conversations.length === 0) {
        throw new Error('Conversa não encontrada ou não pertence ao agente');
      }

      const conversation = conversations[0];

      // Verificar se o agente de destino existe e está ativo
      const [agents] = await connection.execute(
        'SELECT * FROM users WHERE id = ? AND role = "agent" AND status = "active"',
        [toAgentId]
      );

      if (agents.length === 0) {
        throw new Error('Agente de destino não encontrado ou inativo');
      }

      const toAgent = agents[0];

      // Buscar informações do agente atual
      const [fromAgents] = await connection.execute(
        'SELECT name FROM users WHERE id = ?',
        [fromAgentId]
      );

      const fromAgent = fromAgents[0];

      // Atualizar a conversa
      await connection.execute(
        'UPDATE conversations SET agent_id = ?, status = "transferred", updated_at = NOW() WHERE id = ?',
        [toAgentId, conversationId]
      );

      // Registrar a transferência
      const [transferResult] = await connection.execute(
        `INSERT INTO conversation_transfers 
         (conversation_id, from_agent_id, to_agent_id, reason, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [conversationId, fromAgentId, toAgentId, reason, notes]
      );

      const transferId = transferResult.insertId;

      // Adicionar mensagem de sistema sobre a transferência
      await connection.execute(
        `INSERT INTO messages 
         (conversation_id, direction, type, content, is_system_message, created_at) 
         VALUES (?, 'system', 'transfer', ?, true, NOW())`,
        [
          conversationId,
          `Conversa transferida de ${fromAgent.name} para ${toAgent.name}. Motivo: ${this.transferReasons[reason] || reason}`
        ]
      );

      await connection.commit();

      // Notificar o cliente sobre a transferência
      await this.notifyCustomerTransfer(conversation.phone_number, fromAgent.name, toAgent.name);

      // Notificar o novo agente
      await this.notifyAgentNewAssignment(toAgent, conversation, reason, notes);

      // Emitir eventos via socket
      if (socketService) {
        socketService.emitConversationTransferred(conversationId, {
          fromAgentId,
          toAgentId,
          reason,
          notes,
          transferId
        });
      }

      console.log('Conversa transferida com sucesso:', {
        conversationId,
        fromAgentId,
        toAgentId,
        reason,
        transferId
      });

      return {
        success: true,
        transferId,
        message: `Conversa transferida para ${toAgent.name}`
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao transferir conversa:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Buscar agentes disponíveis para transferência
  async getAvailableAgents(currentAgentId, specialization = null) {
    try {
      let query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.specialization,
          u.status,
          COUNT(c.id) as active_conversations,
          u.max_conversations
        FROM users u
        LEFT JOIN conversations c ON u.id = c.agent_id AND c.status IN ('active', 'pending')
        WHERE u.role = 'agent' 
          AND u.status = 'active' 
          AND u.id != ?
      `;
      
      const params = [currentAgentId];

      if (specialization) {
        query += ' AND u.specialization = ?';
        params.push(specialization);
      }

      query += `
        GROUP BY u.id
        HAVING active_conversations < u.max_conversations
        ORDER BY active_conversations ASC, u.name ASC
      `;

      const [agents] = await db.execute(query, params);

      return agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        specialization: agent.specialization,
        activeConversations: agent.active_conversations,
        maxConversations: agent.max_conversations,
        availability: `${agent.active_conversations}/${agent.max_conversations}`
      }));
    } catch (error) {
      console.error('Erro ao buscar agentes disponíveis:', error);
      throw error;
    }
  }

  // Transferência automática por carga de trabalho
  async autoTransferByWorkload(conversationId, currentAgentId, socketService = null) {
    try {
      // Buscar agente com menor carga de trabalho
      const availableAgents = await this.getAvailableAgents(currentAgentId);
      
      if (availableAgents.length === 0) {
        throw new Error('Nenhum agente disponível para transferência');
      }

      const bestAgent = availableAgents[0]; // Já ordenado por carga de trabalho

      return await this.transferConversation(
        conversationId,
        currentAgentId,
        bestAgent.id,
        'WORKLOAD',
        'Transferência automática por balanceamento de carga',
        socketService
      );
    } catch (error) {
      console.error('Erro na transferência automática:', error);
      throw error;
    }
  }

  // Transferir para especialista
  async transferToSpecialist(conversationId, currentAgentId, specialization, notes = '', socketService = null) {
    try {
      const specialists = await this.getAvailableAgents(currentAgentId, specialization);
      
      if (specialists.length === 0) {
        throw new Error(`Nenhum especialista em ${specialization} disponível`);
      }

      const specialist = specialists[0];

      return await this.transferConversation(
        conversationId,
        currentAgentId,
        specialist.id,
        'SPECIALIZATION',
        notes || `Transferência para especialista em ${specialization}`,
        socketService
      );
    } catch (error) {
      console.error('Erro ao transferir para especialista:', error);
      throw error;
    }
  }

  // Notificar cliente sobre transferência
  async notifyCustomerTransfer(phoneNumber, fromAgentName, toAgentName) {
    try {
      const message = `Sua conversa foi transferida de ${fromAgentName} para ${toAgentName}. ` +
        `${toAgentName} continuará seu atendimento. Obrigado pela paciência! 😊`;

      await whatsappService.sendMessage(phoneNumber, message, 'text');
    } catch (error) {
      console.error('Erro ao notificar cliente sobre transferência:', error);
    }
  }

  // Notificar novo agente sobre atribuição
  async notifyAgentNewAssignment(agent, conversation, reason, notes) {
    try {
      // Aqui você pode implementar notificação por email, push notification, etc.
      console.log('Notificando agente sobre nova atribuição:', {
        agentId: agent.id,
        agentName: agent.name,
        conversationId: conversation.id,
        customerPhone: conversation.phone_number,
        reason,
        notes
      });

      // Exemplo de notificação por email (implementar conforme necessário)
      // await emailService.sendNewAssignmentNotification(agent.email, conversation, reason, notes);
    } catch (error) {
      console.error('Erro ao notificar agente:', error);
    }
  }

  // Buscar histórico de transferências
  async getTransferHistory(conversationId) {
    try {
      const [transfers] = await db.execute(
        `SELECT 
           ct.*,
           u1.name as from_agent_name,
           u2.name as to_agent_name
         FROM conversation_transfers ct
         JOIN users u1 ON ct.from_agent_id = u1.id
         JOIN users u2 ON ct.to_agent_id = u2.id
         WHERE ct.conversation_id = ?
         ORDER BY ct.created_at DESC`,
        [conversationId]
      );

      return transfers.map(transfer => ({
        id: transfer.id,
        fromAgent: transfer.from_agent_name,
        toAgent: transfer.to_agent_name,
        reason: this.transferReasons[transfer.reason] || transfer.reason,
        notes: transfer.notes,
        createdAt: transfer.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico de transferências:', error);
      throw error;
    }
  }

  // Estatísticas de transferências
  async getTransferStats(agentId = null, period = '7d') {
    try {
      const periodMap = {
        '1d': '1 DAY',
        '7d': '7 DAY',
        '30d': '30 DAY',
        '90d': '90 DAY'
      };

      let query = `
        SELECT 
          COUNT(*) as total_transfers,
          COUNT(CASE WHEN reason = 'ESCALATION' THEN 1 END) as escalations,
          COUNT(CASE WHEN reason = 'SPECIALIZATION' THEN 1 END) as specializations,
          COUNT(CASE WHEN reason = 'WORKLOAD' THEN 1 END) as workload_transfers,
          COUNT(CASE WHEN reason = 'CUSTOMER_REQUEST' THEN 1 END) as customer_requests,
          AVG(TIMESTAMPDIFF(MINUTE, ct.created_at, 
            (SELECT MIN(m.created_at) FROM messages m 
             WHERE m.conversation_id = ct.conversation_id 
             AND m.created_at > ct.created_at 
             AND m.sender = 'agent')
          )) as avg_response_time_after_transfer
        FROM conversation_transfers ct
        WHERE ct.created_at >= DATE_SUB(NOW(), INTERVAL ${periodMap[period]})
      `;

      const params = [];

      if (agentId) {
        query += ' AND (ct.from_agent_id = ? OR ct.to_agent_id = ?)';
        params.push(agentId, agentId);
      }

      const [stats] = await db.execute(query, params);

      return {
        period,
        ...stats[0],
        avg_response_time_after_transfer: stats[0].avg_response_time_after_transfer ? 
          `${Math.round(stats[0].avg_response_time_after_transfer)} min` : null
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de transferência:', error);
      throw error;
    }
  }

  // Validar se transferência é possível
  async validateTransfer(conversationId, fromAgentId, toAgentId) {
    try {
      const errors = [];

      // Verificar se a conversa existe
      const [conversations] = await db.execute(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
      );

      if (conversations.length === 0) {
        errors.push('Conversa não encontrada');
      } else if (conversations[0].agent_id !== fromAgentId) {
        errors.push('Conversa não pertence ao agente atual');
      }

      // Verificar se o agente de destino existe e está ativo
      const [agents] = await db.execute(
        'SELECT * FROM users WHERE id = ? AND role = "agent"',
        [toAgentId]
      );

      if (agents.length === 0) {
        errors.push('Agente de destino não encontrado');
      } else if (agents[0].status !== 'active') {
        errors.push('Agente de destino não está ativo');
      }

      // Verificar se não é o mesmo agente
      if (fromAgentId === toAgentId) {
        errors.push('Não é possível transferir para o mesmo agente');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Erro ao validar transferência:', error);
      return {
        isValid: false,
        errors: ['Erro interno na validação']
      };
    }
  }
}

module.exports = new TransferService();