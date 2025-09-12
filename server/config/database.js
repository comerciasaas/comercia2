const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'mysql'; // 'mysql' ou 'postgresql'

// Configuração MySQL
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_agents_saas',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Configuração PostgreSQL
const postgresConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_agents_saas',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Inicializar conexão baseada no tipo de banco
let pool;
if (DB_TYPE === 'mysql') {
  pool = mysql.createPool(mysqlConfig);
} else {
  pool = new Pool(postgresConfig);
}

// Test connection
const testConnection = async () => {
  try {
    if (DB_TYPE === 'mysql') {
      const connection = await pool.getConnection();
      console.log('✅ MySQL Connected Successfully');
      
      // Test query
      const [rows] = await connection.execute('SELECT NOW() as now');
      console.log('📅 Database time:', rows[0].now);
      
      connection.release();
      return true;
    } else {
      const client = await pool.connect();
      console.log('✅ PostgreSQL Connected Successfully');
      
      // Test query
      const result = await client.query('SELECT NOW()');
      console.log('📅 Database time:', result.rows[0].now);
      
      client.release();
      return true;
    }
  } catch (error) {
    console.error(`❌ ${DB_TYPE.toUpperCase()} Connection Failed:`, error.message);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database connections...');
  if (DB_TYPE === 'mysql') {
    await pool.end();
  } else {
    await pool.end();
  }
  process.exit(0);
});

// Função para executar queries de forma unificada
const executeQuery = async (query, params = []) => {
  if (DB_TYPE === 'mysql') {
    const [rows] = await pool.execute(query, params);
    return rows;
  } else {
    const result = await pool.query(query, params);
    return result.rows;
  }
};

module.exports = { pool, testConnection, executeQuery, DB_TYPE };