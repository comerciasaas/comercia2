const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function globalTeardown() {
  console.log('🧹 Iniciando limpeza global dos testes...');
  
  try {
    // 1. Limpar dados de teste do banco de dados (opcional)
    if (process.env.CLEAN_TEST_DATA === 'true') {
      console.log('🗑️ Limpando dados de teste do banco...');
      
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ai_agents_saas'
      });
      
      // Remover apenas dados criados durante os testes
      await connection.execute(
        'DELETE FROM users WHERE email LIKE "%test%" AND email != "test@example.com"'
      );
      
      await connection.execute(
        'DELETE FROM agents WHERE name LIKE "%teste%" OR name LIKE "%test%"'
      );
      
      await connection.end();
      console.log('✅ Dados de teste limpos');
    }
    
    // 2. Limpar arquivos temporários de autenticação
    try {
      await fs.unlink('tests/auth-state.json');
      console.log('✅ Estado de autenticação removido');
    } catch (error) {
      // Arquivo pode não existir
    }
    
    // 3. Limpar screenshots e vídeos antigos (manter apenas os mais recentes)
    try {
      const testResultsDir = 'test-results';
      const stats = await fs.stat(testResultsDir).catch(() => null);
      
      if (stats && stats.isDirectory()) {
        console.log('🧹 Limpando arquivos de teste antigos...');
        
        // Manter apenas os últimos 5 relatórios
        const files = await fs.readdir(testResultsDir);
        const htmlReports = files.filter(f => f.startsWith('html-report'));
        
        if (htmlReports.length > 5) {
          const sortedReports = htmlReports
            .map(f => ({ name: f, path: path.join(testResultsDir, f) }))
            .sort((a, b) => {
              const statA = require('fs').statSync(a.path);
              const statB = require('fs').statSync(b.path);
              return statB.mtime - statA.mtime;
            });
          
          // Remover relatórios mais antigos
          for (let i = 5; i < sortedReports.length; i++) {
            await fs.rmdir(sortedReports[i].path, { recursive: true });
          }
        }
        
        console.log('✅ Arquivos antigos limpos');
      }
    } catch (error) {
      console.log('⚠️ Erro ao limpar arquivos antigos:', error.message);
    }
    
    // 4. Gerar resumo dos testes
    try {
      const resultsFile = 'test-results/results.json';
      const resultsStats = await fs.stat(resultsFile).catch(() => null);
      
      if (resultsStats) {
        const results = JSON.parse(await fs.readFile(resultsFile, 'utf8'));
        
        console.log('\n📊 RESUMO DOS TESTES:');
        console.log(`✅ Testes passou: ${results.stats?.passed || 0}`);
        console.log(`❌ Testes falharam: ${results.stats?.failed || 0}`);
        console.log(`⏭️ Testes pulados: ${results.stats?.skipped || 0}`);
        console.log(`⏱️ Duração total: ${Math.round((results.stats?.duration || 0) / 1000)}s`);
        
        // Listar testes que falharam
        if (results.suites) {
          const failedTests = [];
          
          function findFailedTests(suites) {
            for (const suite of suites) {
              if (suite.tests) {
                for (const test of suite.tests) {
                  if (test.status === 'failed') {
                    failedTests.push(`${suite.title} > ${test.title}`);
                  }
                }
              }
              if (suite.suites) {
                findFailedTests(suite.suites);
              }
            }
          }
          
          findFailedTests(results.suites);
          
          if (failedTests.length > 0) {
            console.log('\n❌ TESTES QUE FALHARAM:');
            failedTests.forEach(test => console.log(`  - ${test}`));
          }
        }
        
        console.log(`\n📁 Relatório HTML: test-results/html-report/index.html`);
      }
    } catch (error) {
      console.log('⚠️ Erro ao gerar resumo:', error.message);
    }
    
    console.log('\n🎉 Limpeza global concluída!');
    
  } catch (error) {
    console.error('❌ Erro na limpeza global:', error);
  }
}

module.exports = globalTeardown;