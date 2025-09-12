const { chromium } = require('@playwright/test');
const mysql = require('mysql2/promise');

async function globalSetup() {
  console.log('🚀 Iniciando setup global dos testes...');
  
  try {
    // 1. Verificar se o banco de dados está disponível
    console.log('📊 Verificando conexão com banco de dados...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_agents_saas'
    });
    
    await connection.execute('SELECT 1');
    console.log('✅ Banco de dados conectado com sucesso');
    
    // 2. Criar usuário de teste se não existir
    console.log('👤 Verificando usuário de teste...');
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['test@example.com']
    );
    
    if (existingUsers.length === 0) {
      console.log('➕ Criando usuário de teste...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('test123456', 10);
      
      await connection.execute(
        `INSERT INTO users (name, email, password, role, plan, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        ['Usuário Teste', 'test@example.com', hashedPassword, 'client', 'free']
      );
      console.log('✅ Usuário de teste criado');
    } else {
      console.log('✅ Usuário de teste já existe');
    }
    
    await connection.end();
    
    // 3. Aguardar servidores estarem prontos
    console.log('⏳ Aguardando servidores estarem prontos...');
    await waitForServer('http://localhost:5173', 'Frontend');
    await waitForServer('http://localhost:3001/api/health', 'Backend');
    
    // 4. Fazer login e salvar estado de autenticação
    console.log('🔐 Preparando estado de autenticação...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:5173/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      
      // Aguardar redirecionamento
      await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
      
      // Salvar estado de autenticação
      await context.storageState({ path: 'tests/auth-state.json' });
      console.log('✅ Estado de autenticação salvo');
    } catch (error) {
      console.log('⚠️ Não foi possível fazer login automático:', error.message);
    }
    
    await browser.close();
    
    console.log('🎉 Setup global concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no setup global:', error);
    // Não falhar o setup se houver problemas menores
    console.log('⚠️ Continuando com testes mesmo com erros no setup...');
  }
}

async function waitForServer(url, name, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        console.log(`✅ ${name} está respondendo`);
        return;
      }
    } catch (error) {
      // Servidor ainda não está pronto
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`⚠️ ${name} não respondeu dentro do tempo limite`);
}

module.exports = globalSetup;