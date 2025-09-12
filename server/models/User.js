const { pool, executeQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { 
      name, 
      email, 
      password, 
      role = 'client', 
      plan = 'free',
      company,
      phone = null 
    } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (name, email, password, role, plan, company, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const selectQuery = `
      SELECT id, name, email, role, plan, company, phone, is_active, created_at
      FROM users WHERE email = ?
    `;
    
    const values = [name, email, hashedPassword, role, plan, company, phone];
    await executeQuery(query, values);
    
    const result = await executeQuery(selectQuery, [email]);
    return result[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, name, email, role, plan, company, phone, avatar, is_active, created_at, updated_at
      FROM users 
      WHERE id = ?
    `;
    
    const result = await executeQuery(query, [id]);
    return result[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, name, email, password, role, plan, company, phone, avatar, is_active
      FROM users 
      WHERE email = ?
    `;
    
    const result = await executeQuery(query, [email]);
    return result[0];
  }

  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = `
      SELECT u.id, u.name, u.email, u.role, u.plan, u.company, u.phone,
             u.is_active, u.created_at,
             COUNT(a.id) as agents_count
      FROM users u
      LEFT JOIN agents a ON u.id = a.user_id
    `;
    
    const conditions = [];
    const values = [];

    if (filters.role) {
      conditions.push(`u.role = ?`);
      values.push(filters.role);
    }

    if (filters.plan) {
      conditions.push(`u.plan = ?`);
      values.push(filters.plan);
    }

    if (filters.is_active !== undefined) {
      conditions.push(`u.is_active = ?`);
      values.push(filters.is_active);
    }

    if (filters.search) {
      conditions.push(`(u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)`);
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    values.push(limit, offset);
    
    const result = await executeQuery(query, values);
    return result;
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined && key !== 'id' && key !== 'password') {
        fields.push(`${key} = ?`);
        values.push(userData[key]);
      }
    });

    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      fields.push(`password = ?`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) return null;

    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(query, values);
    
    // Return updated user
    return await this.findById(id);
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(id) {
    const query = `
      UPDATE users 
      SET updated_at = NOW()
      WHERE id = ?
    `;
    await executeQuery(query, [id]);
  }

  static async incrementLoginAttempts(email) {
    // Simplified for MySQL - just return user info
    return await this.findByEmail(email);
  }

  static async getStats() {
    const queries = await Promise.all([
      executeQuery('SELECT COUNT(*) as total FROM users'),
      executeQuery('SELECT COUNT(*) as active FROM users WHERE is_active = true'),
      executeQuery('SELECT plan, COUNT(*) as count FROM users GROUP BY plan'),
      executeQuery(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      executeQuery(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `)
    ]);

    return {
      total: parseInt(queries[0][0].total),
      active: parseInt(queries[1][0].active),
      planDistribution: queries[2],
      dailySignups: queries[3],
      roleDistribution: queries[4]
    };
  }

  static async getDetailedStats() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_users_7d,
        AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as growth_rate
      FROM users
    `;
    
    const result = await executeQuery(query);
    return result[0];
  }
}

module.exports = User;