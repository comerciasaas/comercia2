const User = require('../models/User');
const { executeMainQuery, executeUserQuery } = require('../config/database');

const adminController = {
  // Dashboard com estatísticas gerais do sistema
  async getDashboard(req, res) {
    try {
      const [userStats, systemStats] = await Promise.all([
        User.getDetailedStats(),
        this.getSystemStats()
      ]);

      // Estatísticas de todos os usuários
      const allUsersStats = await this.getAllUsersStats();

      res.json({
        success: true,
        data: {
          users: userStats,
          system: systemStats,
          aggregated: allUsersStats
        }
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao carregar dashboard administrativo' 
      });
    }
  },

  // Obter todos os usuários do sistema
  async getUsers(req, res) {
    try {
      const { limit = 50, offset = 0, search, role, plan, is_active } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (role) filters.role = role;
      if (plan) filters.plan = plan;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const users = await User.findAll(parseInt(limit), parseInt(offset), filters);
      
      // Contar total para paginação
      const totalQuery = `
        SELECT COUNT(*) as total FROM users u
        ${search ? 'WHERE (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)' : ''}
      `;
      const totalParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
      const totalResult = await executeMainQuery(totalQuery, totalParams);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: totalResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar usuários' 
      });
    }
  },

  // Criar novo usuário
  async createUser(req, res) {
    try {
      const userData = req.body;
      const user = await User.create(userData);
      
      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: { user }
      });
    } catch (error) {
      console.error('Create user error:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ 
          success: false, 
          error: 'Email já está em uso' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Erro ao criar usuário' 
      });
    }
  },

  // Atualizar usuário
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await User.update(id, updates);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuário não encontrado' 
        });
      }

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: { user }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar usuário' 
      });
    }
  },

  // Excluir usuário
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const success = await User.delete(id);
      
      if (!success) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuário não encontrado' 
        });
      }

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Erro ao excluir usuário' 
      });
    }
  },

  // Obter todos os agentes de todos os usuários
  async getAllAgents(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      // Buscar todos os usuários ativos
      const users = await executeMainQuery('SELECT id FROM users WHERE is_active = true AND role != "admin"');
      
      let allAgents = [];
      
      for (const user of users) {
        try {
          const userAgents = await executeUserQuery(user.id, `
            SELECT a.*, ${user.id} as user_id,
                   COUNT(c.id) as total_conversations,
                   COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_conversations
            FROM agents a
            LEFT JOIN conversations c ON a.id = c.agent_id
            GROUP BY a.id
            ORDER BY a.created_at DESC
          `);
          
          allAgents = allAgents.concat(userAgents);
        } catch (error) {
          console.error(`Erro ao buscar agentes do usuário ${user.id}:`, error);
        }
      }

      // Aplicar paginação
      const paginatedAgents = allAgents.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: {
          agents: paginatedAgents,
          pagination: {
            total: allAgents.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      console.error('Get all agents error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar agentes' 
      });
    }
  },

  // Obter todas as conversas de todos os usuários
  async getAllConversations(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      // Buscar todos os usuários ativos
      const users = await executeMainQuery('SELECT id, name, email FROM users WHERE is_active = true AND role != "admin"');
      
      let allConversations = [];
      
      for (const user of users) {
        try {
          const userConversations = await executeUserQuery(user.id, `
            SELECT c.*, a.name as agent_name, ${user.id} as user_id, '${user.name}' as user_name, '${user.email}' as user_email,
                   COUNT(m.id) as message_count,
                   MAX(m.timestamp) as last_message_time
            FROM conversations c
            LEFT JOIN agents a ON c.agent_id = a.id
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id, a.name
            ORDER BY c.start_time DESC
          `);
          
          allConversations = allConversations.concat(userConversations);
        } catch (error) {
          console.error(`Erro ao buscar conversas do usuário ${user.id}:`, error);
        }
      }

      // Ordenar por data mais recente
      allConversations.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

      // Aplicar paginação
      const paginatedConversations = allConversations.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: {
          conversations: paginatedConversations,
          pagination: {
            total: allConversations.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      console.error('Get all conversations error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar conversas' 
      });
    }
  },

  // Estatísticas do sistema
  async getSystemStats() {
    try {
      const [systemInfo] = await executeMainQuery(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role != 'admin') as total_clients,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND role != 'admin') as active_clients,
          (SELECT COUNT(*) FROM user_databases WHERE status = 'active') as active_databases,
          (SELECT COUNT(*) FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as actions_24h
      `);

      return systemInfo;
    } catch (error) {
      console.error('System stats error:', error);
      return {
        total_clients: 0,
        active_clients: 0,
        active_databases: 0,
        actions_24h: 0
      };
    }
  },

  // Estatísticas agregadas de todos os usuários
  async getAllUsersStats() {
    try {
      const users = await executeMainQuery('SELECT id FROM users WHERE is_active = true AND role != "admin"');
      
      let totalAgents = 0;
      let totalConversations = 0;
      let totalMessages = 0;
      let avgSatisfaction = 0;
      let satisfactionCount = 0;

      for (const user of users) {
        try {
          const [agentCount] = await executeUserQuery(user.id, 'SELECT COUNT(*) as count FROM agents');
          const [convCount] = await executeUserQuery(user.id, 'SELECT COUNT(*) as count FROM conversations');
          const [msgCount] = await executeUserQuery(user.id, 'SELECT COUNT(*) as count FROM messages');
          const [satisfaction] = await executeUserQuery(user.id, 'SELECT AVG(satisfaction_rating) as avg, COUNT(satisfaction_rating) as count FROM conversations WHERE satisfaction_rating IS NOT NULL');

          totalAgents += agentCount.count || 0;
          totalConversations += convCount.count || 0;
          totalMessages += msgCount.count || 0;
          
          if (satisfaction.avg) {
            avgSatisfaction += satisfaction.avg * satisfaction.count;
            satisfactionCount += satisfaction.count;
          }
        } catch (error) {
          console.error(`Erro ao buscar stats do usuário ${user.id}:`, error);
        }
      }

      return {
        total_agents: totalAgents,
        total_conversations: totalConversations,
        total_messages: totalMessages,
        avg_satisfaction: satisfactionCount > 0 ? avgSatisfaction / satisfactionCount : 0
      };
    } catch (error) {
      console.error('All users stats error:', error);
      return {
        total_agents: 0,
        total_conversations: 0,
        total_messages: 0,
        avg_satisfaction: 0
      };
    }
  },

  // Logs de auditoria
  async getAuditLogs(req, res) {
    try {
      const { limit = 50, offset = 0, action, user_id } = req.query;
      
      let query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
      `;
      
      const conditions = [];
      const values = [];

      if (action) {
        conditions.push('al.action = ?');
        values.push(action);
      }

      if (user_id) {
        conditions.push('al.user_id = ?');
        values.push(user_id);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += `
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      values.push(parseInt(limit), parseInt(offset));
      
      const logs = await executeMainQuery(query, values);

      res.json({
        success: true,
        data: { logs }
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar logs de auditoria' 
      });
    }
  },

  // Alertas do sistema
  async getAlerts(req, res) {
    try {
      const { limit = 50, offset = 0, severity, is_resolved } = req.query;
      
      let query = `
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM alerts a
        LEFT JOIN users u ON a.user_id = u.id
      `;
      
      const conditions = [];
      const values = [];

      if (severity) {
        conditions.push('a.severity = ?');
        values.push(severity);
      }

      if (is_resolved !== undefined) {
        conditions.push('a.is_resolved = ?');
        values.push(is_resolved === 'true');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += `
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      values.push(parseInt(limit), parseInt(offset));
      
      const alerts = await executeMainQuery(query, values);

      res.json({
        success: true,
        data: { alerts }
      });
    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar alertas' 
      });
    }
  },

  // Resolver alerta
  async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      
      await executeMainQuery(
        'UPDATE alerts SET is_resolved = true, updated_at = NOW() WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Alerta resolvido com sucesso'
      });
    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao resolver alerta' 
      });
    }
  },

  // Saúde do sistema
  async getSystemHealth(req, res) {
    try {
      const health = {
        database: 'healthy',
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      };

      // Verificar conexão com banco
      try {
        await executeMainQuery('SELECT 1');
      } catch (error) {
        health.database = 'unhealthy';
      }

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('System health error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao verificar saúde do sistema' 
      });
    }
  },

  // Configurações do sistema
  async getSystemSettings(req, res) {
    try {
      const settings = await executeMainQuery(
        'SELECT category, setting_key, setting_value, description FROM system_settings ORDER BY category, setting_key'
      );

      // Organizar por categoria
      const organized = {};
      settings.forEach(setting => {
        if (!organized[setting.category]) {
          organized[setting.category] = {};
        }
        organized[setting.category][setting.setting_key] = {
          value: setting.setting_value,
          description: setting.description
        };
      });

      res.json({
        success: true,
        data: organized
      });
    } catch (error) {
      console.error('Get system settings error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar configurações' 
      });
    }
  },

  // Atualizar configurações do sistema
  async updateSystemSettings(req, res) {
    try {
      const { category, settings } = req.body;

      for (const [key, value] of Object.entries(settings)) {
        await executeMainQuery(
          `INSERT INTO system_settings (category, setting_key, setting_value, updated_at) 
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [category, key, value]
        );
      }

      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso'
      });
    } catch (error) {
      console.error('Update system settings error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar configurações' 
      });
    }
  }
};

module.exports = adminController;