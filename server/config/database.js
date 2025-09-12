const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração principal do banco (para sistema e usuários)
const mainConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_agents_saas_main',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4'
};

// Pool principal para sistema
const mainPool = mysql.createPool(mainConfig);

// Cache de pools de usuários
const userPools = new Map();

// Função para criar banco de dados de usuário
const createUserDatabase = async (userId) => {
  const dbName = `ai_agents_user_${userId}`;
  
  try {
    // Conectar sem especificar database para criar
    const tempConnection = await mysql.createConnection({
      host: mainConfig.host,
      port: mainConfig.port,
      user: mainConfig.user,
      password: mainConfig.password,
      charset: 'utf8mb4'
    });

    // Criar database do usuário
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();

    // Criar pool para o usuário
    const userPool = mysql.createPool({
      ...mainConfig,
      database: dbName
    });

    // Criar tabelas do usuário
    await createUserTables(userPool);
    
    // Armazenar pool no cache
    userPools.set(userId, userPool);
    
    console.log(`✅ Database criado para usuário ${userId}: ${dbName}`);
    return userPool;
  } catch (error) {
    console.error(`❌ Erro ao criar database para usuário ${userId}:`, error);
    throw error;
  }
};

// Função para criar tabelas do usuário
const createUserTables = async (pool) => {
  const tables = [
    // Tabela de agentes
    `CREATE TABLE IF NOT EXISTS agents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      objective TEXT,
      personality ENUM('formal', 'casual', 'friendly', 'professional') DEFAULT 'professional',
      ai_provider ENUM('chatgpt', 'gemini', 'huggingface') NOT NULL,
      model VARCHAR(100) NOT NULL,
      system_prompt TEXT,
      temperature DECIMAL(3,2) DEFAULT 0.7,
      max_tokens INT DEFAULT 1000,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_agents_active (is_active),
      INDEX idx_agents_provider (ai_provider)
    )`,
    
    // Tabela de conversas
    `CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agent_id INT,
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      customer_phone VARCHAR(20),
      channel_type ENUM('whatsapp', 'telegram', 'web', 'api') DEFAULT 'whatsapp',
      status ENUM('active', 'resolved', 'pending', 'closed') DEFAULT 'active',
      priority INT DEFAULT 1,
      satisfaction_rating DECIMAL(2,1),
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP NULL,
      resolution_time INT,
      tags JSON,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      INDEX idx_conversations_agent (agent_id),
      INDEX idx_conversations_status (status),
      INDEX idx_conversations_channel (channel_type),
      INDEX idx_conversations_phone (customer_phone),
      INDEX idx_conversations_created (created_at)
    )`,
    
    // Tabela de mensagens
    `CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      content TEXT NOT NULL,
      sender ENUM('user', 'agent') NOT NULL,
      message_type ENUM('text', 'image', 'audio', 'document', 'video') DEFAULT 'text',
      media_url VARCHAR(500),
      whatsapp_message_id VARCHAR(100),
      status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
      response_time INT,
      metadata JSON,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      INDEX idx_messages_conversation (conversation_id),
      INDEX idx_messages_sender (sender),
      INDEX idx_messages_timestamp (timestamp),
      INDEX idx_messages_whatsapp_id (whatsapp_message_id)
    )`,
    
    // Tabela de sessões WhatsApp
    `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(20) NOT NULL UNIQUE,
      contact_name VARCHAR(255),
      agent_id INT,
      status ENUM('active', 'inactive', 'ended') DEFAULT 'active',
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
      INDEX idx_whatsapp_phone (phone_number),
      INDEX idx_whatsapp_agent (agent_id),
      INDEX idx_whatsapp_status (status),
      INDEX idx_whatsapp_activity (last_activity)
    )`,
    
    // Tabela de métricas de agentes
    `CREATE TABLE IF NOT EXISTS agent_metrics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agent_id INT NOT NULL,
      date DATE NOT NULL,
      total_conversations INT DEFAULT 0,
      total_messages INT DEFAULT 0,
      avg_response_time DECIMAL(8,2) DEFAULT 0,
      satisfaction_rating DECIMAL(3,2) DEFAULT 0,
      resolution_rate DECIMAL(5,2) DEFAULT 0,
      escalation_rate DECIMAL(5,2) DEFAULT 0,
      active_conversations INT DEFAULT 0,
      sla_compliance DECIMAL(5,2) DEFAULT 0,
      cost_per_message DECIMAL(10,4) DEFAULT 0,
      revenue_generated DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      UNIQUE KEY unique_agent_date (agent_id, date),
      INDEX idx_metrics_agent (agent_id),
      INDEX idx_metrics_date (date)
    )`
  ];

  for (const table of tables) {
    await pool.execute(table);
  }
};

// Função para obter pool do usuário
const getUserPool = async (userId) => {
  if (userPools.has(userId)) {
    return userPools.get(userId);
  }
  
  return await createUserDatabase(userId);
};

// Test connection
const testConnection = async () => {
  try {
    const connection = await mainPool.getConnection();
    console.log('✅ MySQL Connected Successfully');
    
    // Test query
    const [rows] = await connection.execute('SELECT NOW() as now');
    console.log('📅 Database time:', rows[0].now);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL Connection Failed:', error.message);
    return false;
  }
};

// Função para executar queries no banco principal
const executeMainQuery = async (query, params = []) => {
  const [rows] = await mainPool.execute(query, params);
  return rows;
};

// Função para executar queries no banco do usuário
const executeUserQuery = async (userId, query, params = []) => {
  const pool = await getUserPool(userId);
  const [rows] = await pool.execute(query, params);
  return rows;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database connections...');
  await mainPool.end();
  
  for (const [userId, pool] of userPools) {
    await pool.end();
  }
  
  process.exit(0);
});

module.exports = { 
  mainPool, 
  testConnection, 
  executeMainQuery, 
  executeUserQuery,
  getUserPool,
  createUserDatabase
};