const mysql = require('mysql2/promise');
require('dotenv').config();

async function createLogsTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_agents_saas'
  });

  try {
    console.log('Criando tabelas de logs...');

    // Create Audit Logs Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INT,
        old_values JSON,
        new_values JSON,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_audit_logs_user_id (user_id),
        INDEX idx_audit_logs_action (action),
        INDEX idx_audit_logs_resource (resource_type),
        INDEX idx_audit_logs_timestamp (timestamp),
        INDEX idx_audit_logs_created_at (created_at)
      )
    `);
    console.log('✓ Tabela audit_logs criada');

    // Create System Logs Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(20) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        module VARCHAR(100),
        context JSON,
        stack_trace TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_system_logs_level (level),
        INDEX idx_system_logs_module (module),
        INDEX idx_system_logs_created_at (created_at)
      )
    `);
    console.log('✓ Tabela system_logs criada');

    // Create Security Logs Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        event_type VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        details TEXT,
        severity VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_security_logs_user_id (user_id),
        INDEX idx_security_logs_event_type (event_type),
        INDEX idx_security_logs_created_at (created_at)
      )
    `);
    console.log('✓ Tabela security_logs criada');

    // Create Performance Logs Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS performance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        response_time INT,
        status_code INT,
        user_id INT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_performance_logs_endpoint (endpoint),
        INDEX idx_performance_logs_created_at (created_at)
      )
    `);
    console.log('✓ Tabela performance_logs criada');

    console.log('\n✅ Todas as tabelas de logs foram criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    await connection.end();
  }
}

createLogsTables();