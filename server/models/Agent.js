const { pool, executeQuery } = require('../config/database');

class Agent {
  static async create(agentData) {
    const {
      user_id,
      name,
      description,
      objective,
      personality = 'professional',
      ai_provider,
      model,
      system_prompt,
      temperature = 0.7,
      max_tokens = 1000
    } = agentData;
    
    const query = `
      INSERT INTO agents (user_id, name, description, objective, personality, 
                         ai_provider, model, system_prompt, temperature, max_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [user_id, name, description, objective, personality, 
                   ai_provider, model, system_prompt, temperature, max_tokens];
    
    const result = await executeQuery(query, values);
    return { id: result.insertId, ...agentData };
  }

  static async findById(id) {
    const query = `
      SELECT a.*, u.name as user_name, u.email as user_email,
             COUNT(c.id) as total_conversations,
             0 as avg_response_time,
             AVG(conv.satisfaction_rating) as avg_satisfaction
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN conversations c ON a.id = c.agent_id
      WHERE a.id = ?
    `;
    
    const result = await executeQuery(query, [id]);
    return result[0];
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT a.*, 
             0 as total_conversations,
             0 as active_conversations,
             0 as avg_response_time,
             0 as avg_satisfaction
      FROM agents a
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const result = await executeQuery(query, [userId, limit, offset]);
    return result;
  }

  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email, u.company,
             0 as total_conversations,
             0 as active_conversations,
             0 as avg_response_time,
             0 as avg_satisfaction,
             a.created_at as last_activity
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (filters.is_active !== undefined) {
      conditions.push(`a.is_active = ?`);
      values.push(filters.is_active);
    }

    if (filters.ai_provider) {
      conditions.push(`a.ai_provider = ?`);
      values.push(filters.ai_provider);
    }

    if (filters.user_id) {
      conditions.push(`a.user_id = ?`);
      values.push(filters.user_id);
    }

    if (filters.search) {
      conditions.push(`(a.name LIKE ? OR a.description LIKE ? OR u.name LIKE ?)`);
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    values.push(limit, offset);
    
    const result = await executeQuery(query, values);
    return result;
  }

  static async update(id, agentData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(agentData).forEach(key => {
      if (agentData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(agentData[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);

    const query = `
      UPDATE agents 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;

    const result = await executeQuery(query, values);
    return result[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM agents WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  static async getStats() {
    const queries = await Promise.all([
      executeQuery('SELECT COUNT(*) as total FROM agents'),
      executeQuery('SELECT COUNT(*) as active FROM agents WHERE is_active = true'),
      executeQuery('SELECT ai_provider, COUNT(*) as count FROM agents GROUP BY ai_provider'),
      executeQuery(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM agents 
        WHERE created_at >= NOW() - INTERVAL 30 DAY
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      executeQuery(`
        SELECT personality, COUNT(*) as count 
        FROM agents 
        GROUP BY personality
      `)
    ]);

    return {
      total: parseInt(queries[0][0].total),
      active: parseInt(queries[1][0].active),
      providerDistribution: queries[2],
      dailyCreated: queries[3],
      personalityDistribution: queries[4]
    };
  }

  static async getPerformanceMetrics(agentId, days = 30) {
    const query = `
      SELECT 
        DATE(am.date) as date,
        am.total_conversations,
        am.avg_response_time,
        am.satisfaction_rating,
        am.resolution_rate,
        am.escalation_rate,
        am.sla_compliance
      FROM agent_metrics am
      WHERE am.agent_id = ? 
        AND am.date >= NOW() - INTERVAL ${days} DAY
      ORDER BY am.date
    `;
    
    const result = await executeQuery(query, [agentId]);
    return result;
  }

  static async updateMetrics(agentId, date, metrics) {
    const query = `
      INSERT INTO agent_metrics (
        agent_id, date, total_conversations, total_messages, avg_response_time,
        satisfaction_rating, resolution_rate, escalation_rate, active_conversations,
        sla_compliance, cost_per_message, revenue_generated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_conversations = VALUES(total_conversations),
        total_messages = VALUES(total_messages),
        avg_response_time = VALUES(avg_response_time),
        satisfaction_rating = VALUES(satisfaction_rating),
        resolution_rate = VALUES(resolution_rate),
        escalation_rate = VALUES(escalation_rate),
        active_conversations = VALUES(active_conversations),
        sla_compliance = VALUES(sla_compliance),
        cost_per_message = VALUES(cost_per_message),
        revenue_generated = VALUES(revenue_generated)
    `;
    
    const values = [
      agentId, date, metrics.total_conversations || 0, metrics.total_messages || 0,
      metrics.avg_response_time || 0, metrics.satisfaction_rating || 0,
      metrics.resolution_rate || 0, metrics.escalation_rate || 0,
      metrics.active_conversations || 0, metrics.sla_compliance || 0,
      metrics.cost_per_message || 0, metrics.revenue_generated || 0
    ];
    
    const result = await executeQuery(query, values);
    return result;
  }
}

module.exports = Agent;