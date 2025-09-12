const { pool, executeQuery } = require('../config/database');

class Conversation {
  static async create(conversationData) {
    const {
      agent_id,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      channel_type,
      status = 'active',
      priority = 1,
      tags = []
    } = conversationData;
    
    const query = `
      INSERT INTO conversations (
        agent_id, customer_id, customer_name, customer_email, 
        customer_phone, channel_type, status, priority, tags
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      agent_id, customer_id, customer_name, customer_email,
      customer_phone, channel_type, status, priority, tags
    ];
    
    const result = await executeQuery(query, values);
    return result.insertId ? { id: result.insertId, ...conversationData } : result[0];
  }

  static async findById(id) {
    const query = `
      SELECT c.*, a.name as agent_name, u.name as user_name,
             COUNT(m.id) as message_count,
             MAX(m.timestamp) as last_message_time
      FROM conversations c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = ?
      GROUP BY c.id, a.name, u.name
    `;
    
    const result = await executeQuery(query, [id]);
    return result[0];
  }

  static async findByAgentId(agentId, limit = 50, offset = 0, filters = {}) {
    let query = `
      SELECT c.*, a.name as agent_name,
             COUNT(m.id) as message_count,
             MAX(m.timestamp) as last_message_time
      FROM conversations c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.agent_id = ?
    `;
    
    const values = [agentId];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND c.status = ?`;
      values.push(filters.status);
    }

    if (filters.channel_type) {
      query += ` AND c.channel_type = ?`;
      values.push(filters.channel_type);
    }

    if (filters.customer_search) {
      query += ` AND (c.customer_name LIKE ? OR c.customer_email LIKE ?)`;
      values.push(`%${filters.customer_search}%`, `%${filters.customer_search}%`);
    }

    query += `
      GROUP BY c.id, a.name
      ORDER BY c.start_time DESC
      LIMIT ? OFFSET ?
    `;
    
    values.push(limit, offset);
    
    const result = await executeQuery(query, values);
    return result;
  }

  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = `
      SELECT c.*, a.name as agent_name, u.name as user_name, u.company,
             COUNT(m.id) as message_count,
             MAX(m.timestamp) as last_message_time
      FROM conversations c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (filters.status) {
      conditions.push(`c.status = ?`);
      values.push(filters.status);
    }

    if (filters.channel_type) {
      conditions.push(`c.channel_type = ?`);
      values.push(filters.channel_type);
    }

    if (filters.agent_id) {
      conditions.push(`c.agent_id = ?`);
      values.push(filters.agent_id);
    }

    if (filters.user_id) {
      conditions.push(`a.user_id = ?`);
      values.push(filters.user_id);
    }

    if (filters.search) {
      paramCount++;
      conditions.push(`(c.customer_name LIKE ? OR c.customer_email LIKE ? OR a.name LIKE ?)`);
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.date_from) {
      conditions.push(`c.start_time >= ?`);
      values.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`c.start_time <= ?`);
      values.push(filters.date_to);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY c.id, a.name, u.name, u.company
      ORDER BY c.start_time DESC
      LIMIT ? OFFSET ?
    `;
    
    values.push(limit, offset);
    
    const result = await executeQuery(query, values);
    return result;
  }

  static async update(id, conversationData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(conversationData).forEach(key => {
      if (conversationData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(conversationData[key]);
      }
    });

    if (fields.length === 0) return null;

    paramCount++;
    values.push(id);

    const query = `
      UPDATE conversations 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;

    const result = await executeQuery(query, values);
    return result[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM conversations WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.length > 0;
  }

  static async getWithMessages(conversationId, messageLimit = 100) {
    const conversationQuery = `
      SELECT c.*, a.name as agent_name, u.name as user_name
      FROM conversations c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE c.id = ?
    `;
    
    const messagesQuery = `
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC 
      LIMIT ?
    `;

    const [conversationResult, messagesResult] = await Promise.all([
      executeQuery(conversationQuery, [conversationId]),
      executeQuery(messagesQuery, [conversationId, messageLimit])
    ]);

    if (conversationResult.length === 0) return null;

    return {
      ...conversationResult[0],
      messages: messagesResult
    };
  }

  static async getStats() {
    const queries = await Promise.all([
      executeQuery('SELECT COUNT(*) as total FROM conversations'),
      executeQuery('SELECT COUNT(*) as active FROM conversations WHERE status = \'active\''),
      executeQuery('SELECT AVG(satisfaction_rating) as avg FROM conversations WHERE satisfaction_rating IS NOT NULL'),
      executeQuery('SELECT status, COUNT(*) as count FROM conversations GROUP BY status'),
      executeQuery('SELECT channel_type, COUNT(*) as count FROM conversations GROUP BY channel_type'),
      executeQuery(`
        SELECT DATE(start_time) as date, COUNT(*) as count 
        FROM conversations 
        WHERE start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(start_time)
        ORDER BY date
      `)
    ]);

    return {
      total: parseInt(queries[0][0].total),
      active: parseInt(queries[1][0].active),
      avgSatisfaction: parseFloat(queries[2][0].avg) || 0,
      statusDistribution: queries[3],
      channelDistribution: queries[4],
      dailyConversations: queries[5]
    };
  }

  static async getDetailedStats(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
        COUNT(CASE WHEN status = 'transferred' THEN 1 END) as transferred_conversations,
        AVG(satisfaction_rating) as avg_satisfaction,
        AVG(CASE WHEN end_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) END) as avg_duration_minutes
      FROM conversations
    `;
    
    const conditions = [];
    const values = [];

    if (filters.agent_id) {
      conditions.push(`agent_id = ?`);
      values.push(filters.agent_id);
    }

    if (filters.date_from) {
      conditions.push(`start_time >= ?`);
      values.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`start_time <= ?`);
      values.push(filters.date_to);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = await executeQuery(query, values);
    return result[0];
  }
}

module.exports = Conversation;