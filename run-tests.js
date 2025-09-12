#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60));
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`Executando: ${command} ${args.join(' ')}`, 'yellow');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ Comando executado com sucesso`, 'green');
        resolve(code);
      } else {
        log(`❌ Comando falhou com código: ${code}`, 'red');
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      log(`❌ Erro ao executar comando: ${error.message}`, 'red');
      reject(error);
    });
  });
}

async function checkServers() {
  logHeader('🔍 VERIFICANDO SERVIDORES');
  
  const servers = [
    { name: 'Frontend', url: 'http://localhost:5173', port: 5173 },
    { name: 'Backend', url: 'http://localhost:3001', port: 3001 }
  ];
  
  for (const server of servers) {
    try {
      const response = await fetch(server.url);
      if (response.ok || response.status < 500) {
        log(`✅ ${server.name} está rodando em ${server.url}`, 'green');
      } else {
        log(`⚠️ ${server.name} respondeu com status ${response.status}`, 'yellow');
      }
    } catch (error) {
      log(`❌ ${server.name} não está respondendo em ${server.url}`, 'red');
      log(`   Certifique-se de que o servidor está rodando na porta ${server.port}`, 'yellow');
    }
  }
}

async function runTests() {
  try {
    logHeader('🚀 INICIANDO TESTES E2E DO FRONTEND');
    
    // Verificar se os servidores estão rodando
    await checkServers();
    
    // Criar diretório de resultados se não existir
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
    
    logHeader('🎭 EXECUTANDO TESTES PLAYWRIGHT');
    
    // Executar testes
    await runCommand('npx', ['playwright', 'test', '--reporter=list,html']);
    
    logHeader('📊 TESTES CONCLUÍDOS');
    log('✅ Todos os testes foram executados!', 'green');
    log('📁 Relatório HTML disponível em: test-results/html-report/index.html', 'cyan');
    log('🌐 Para abrir o relatório: npm run test:e2e:report', 'cyan');
    
  } catch (error) {
    logHeader('❌ ERRO NOS TESTES');
    log(`Erro: ${error.message}`, 'red');
    log('\n📋 COMANDOS ÚTEIS:', 'yellow');
    log('  npm run test:e2e:headed  - Executar com navegador visível', 'cyan');
    log('  npm run test:e2e:debug   - Executar em modo debug', 'cyan');
    log('  npm run test:e2e:ui      - Executar com interface gráfica', 'cyan');
    log('  npm run test:e2e:report  - Abrir relatório dos testes', 'cyan');
    
    process.exit(1);
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  logHeader('🎭 SCRIPT DE TESTES E2E');
  console.log('\nUso: node run-tests.js [opções]\n');
  console.log('Opções:');
  console.log('  --headed     Executar com navegador visível');
  console.log('  --debug      Executar em modo debug');
  console.log('  --ui         Executar com interface gráfica');
  console.log('  --project    Especificar projeto (chromium, firefox, webkit)');
  console.log('  --help, -h   Mostrar esta ajuda\n');
  console.log('Exemplos:');
  console.log('  node run-tests.js');
  console.log('  node run-tests.js --headed');
  console.log('  node run-tests.js --project=chromium');
  process.exit(0);
}

// Executar testes
runTests();