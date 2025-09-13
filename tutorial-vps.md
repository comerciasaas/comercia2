# 🌐 TUTORIAL - DEPLOY EM VPS

## 📋 PRÉ-REQUISITOS VPS

### Especificações Mínimas
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ ou CentOS 8+
- **Bandwidth**: 100GB/mês

### Provedores Recomendados
- **DigitalOcean**: Droplet $20/mês
- **Vultr**: Cloud Compute $12/mês
- **Linode**: Shared CPU $12/mês
- **AWS**: t3.small $15/mês
- **Google Cloud**: e2-small $13/mês

---

## 🔧 CONFIGURAÇÃO INICIAL DA VPS

### 1. Conectar via SSH
```bash
ssh root@seu-ip-da-vps
# ou
ssh usuario@seu-ip-da-vps
```

### 2. Atualizar Sistema
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 3. Instalar Dependências
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL
sudo apt install mysql-server -y

# Nginx (proxy reverso)
sudo apt install nginx -y

# PM2 (gerenciador de processos)
sudo npm install -g pm2

# Git (se necessário)
sudo apt install git -y
```

---

## 🗄️ CONFIGURAR MYSQL

### 1. Configuração Inicial
```bash
# Iniciar MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar segurança
sudo mysql_secure_installation
```

### 2. Criar Usuário e Banco
```sql
# Acessar MySQL
sudo mysql -u root -p

-- Criar usuário para aplicação
CREATE USER 'aiagents'@'localhost' IDENTIFIED BY 'senha_super_segura';
GRANT ALL PRIVILEGES ON *.* TO 'aiagents'@'localhost';
FLUSH PRIVILEGES;

-- Criar banco principal
CREATE DATABASE ai_agents_saas_main CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sair
EXIT;
```

### 3. Configurar MySQL para Produção
```bash
# Editar configuração
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Adicionar/modificar:
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
query_cache_size = 64M
tmp_table_size = 64M
max_heap_table_size = 64M

# Reiniciar MySQL
sudo systemctl restart mysql
```

---

## 📁 DEPLOY DA APLICAÇÃO

### 1. Transferir Arquivos
```bash
# Opção 1: Git (recomendado)
git clone https://github.com/seu-usuario/ai-agents-saas.git
cd ai-agents-saas

# Opção 2: SCP
scp -r ./projeto-local usuario@ip-vps:/home/usuario/ai-agents-saas

# Opção 3: SFTP
sftp usuario@ip-vps
put -r projeto-local /home/usuario/ai-agents-saas
```

### 2. Instalar Dependências
```bash
cd /home/usuario/ai-agents-saas

# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 3. Configurar Variáveis de Ambiente
```bash
cd server
cp .env.example .env
nano .env
```

**Configuração para Produção:**
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=aiagents
DB_PASSWORD=senha_super_segura
DB_NAME=ai_agents_saas_main

# Server
PORT=3001
NODE_ENV=production

# JWT - GERAR NOVA CHAVE SEGURA
JWT_SECRET=chave_jwt_super_segura_producao_256_bits

# CORS - SEU DOMÍNIO
CORS_ORIGIN=https://seudominio.com

# APIs de IA
OPENAI_API_KEY=sk-proj-sua-chave-openai
GOOGLE_GEMINI_API_KEY=sua-chave-gemini
HUGGINGFACE_API_KEY=hf_sua-chave-huggingface

# WhatsApp
WHATSAPP_ACCESS_TOKEN=seu-token-whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu-verify-token

# Security
SESSION_SECRET=session_secret_super_segura
ENCRYPTION_KEY=encryption_key_32_chars_exactly

# Rate Limiting (produção)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Setup do Banco de Dados
```bash
cd server
npm run setup-db
```

### 5. Build do Frontend
```bash
cd /home/usuario/ai-agents-saas
npm run build
```

---

## 🌐 CONFIGURAR NGINX

### 1. Criar Configuração do Site
```bash
sudo nano /etc/nginx/sites-available/ai-agents-saas
```

**Conteúdo do arquivo:**
```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Frontend (arquivos estáticos)
    location / {
        root /home/usuario/ai-agents-saas/dist;
        try_files $uri $uri/ /index.html;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Painel Admin
    location /admin {
        alias /home/usuario/ai-agents-saas/public/admin;
        try_files $uri $uri/ /admin/index.html;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/ai-agents-access.log;
    error_log /var/log/nginx/ai-agents-error.log;
}
```

### 2. Ativar Site
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/ai-agents-saas /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔒 CONFIGURAR SSL/HTTPS

### 1. Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obter Certificado SSL
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

### 3. Configuração Automática
O Certbot irá modificar automaticamente o Nginx para HTTPS.

### 4. Testar Renovação
```bash
sudo certbot renew --dry-run
```

---

## 🚀 CONFIGURAR PM2

### 1. Criar Arquivo de Configuração
```bash
nano /home/usuario/ai-agents-saas/ecosystem.config.js
```

**Conteúdo:**
```javascript
module.exports = {
  apps: [{
    name: 'ai-agents-saas',
    script: './server/app.js',
    cwd: '/home/usuario/ai-agents-saas',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 2. Criar Diretório de Logs
```bash
mkdir -p /home/usuario/ai-agents-saas/logs
```

### 3. Iniciar com PM2
```bash
cd /home/usuario/ai-agents-saas
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔥 CONFIGURAR FIREWALL

### 1. UFW (Ubuntu)
```bash
# Ativar firewall
sudo ufw enable

# Permitir SSH
sudo ufw allow ssh

# Permitir HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Verificar status
sudo ufw status
```

### 2. Fail2Ban (Proteção SSH)
```bash
# Instalar
sudo apt install fail2ban -y

# Configurar
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Iniciar
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 📊 MONITORAMENTO

### 1. PM2 Monitoring
```bash
# Status dos processos
pm2 status

# Logs em tempo real
pm2 logs

# Monitoramento
pm2 monit

# Restart se necessário
pm2 restart ai-agents-saas
```

### 2. Logs do Sistema
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/ai-agents-access.log
sudo tail -f /var/log/nginx/ai-agents-error.log

# Logs da aplicação
tail -f /home/usuario/ai-agents-saas/logs/combined.log

# Logs do MySQL
sudo tail -f /var/log/mysql/error.log
```

### 3. Recursos do Sistema
```bash
# CPU e Memória
htop

# Espaço em disco
df -h

# Conexões de rede
netstat -tulpn
```

---

## 🔄 BACKUP E MANUTENÇÃO

### 1. Backup do Banco de Dados
```bash
# Criar script de backup
nano /home/usuario/backup-db.sh
```

**Script de backup:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/usuario/backups"
mkdir -p $BACKUP_DIR

# Backup banco principal
mysqldump -u aiagents -p ai_agents_saas_main > $BACKUP_DIR/main_$DATE.sql

# Backup bancos de usuários
mysql -u aiagents -p -e "SHOW DATABASES LIKE 'ai_agents_user_%'" | grep ai_agents_user | while read db; do
    mysqldump -u aiagents -p $db > $BACKUP_DIR/${db}_$DATE.sql
done

# Compactar
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/*_$DATE.sql
rm $BACKUP_DIR/*_$DATE.sql

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

```bash
# Dar permissão
chmod +x /home/usuario/backup-db.sh

# Agendar no crontab
crontab -e
# Adicionar: 0 2 * * * /home/usuario/backup-db.sh
```

### 2. Atualização da Aplicação
```bash
# Script de atualização
nano /home/usuario/update-app.sh
```

**Script de atualização:**
```bash
#!/bin/bash
cd /home/usuario/ai-agents-saas

# Backup antes da atualização
./backup-db.sh

# Parar aplicação
pm2 stop ai-agents-saas

# Atualizar código (se usando Git)
git pull origin main

# Instalar dependências
npm install
cd server && npm install && cd ..

# Build frontend
npm run build

# Executar migrations se houver
# cd server && npm run migrate && cd ..

# Reiniciar aplicação
pm2 restart ai-agents-saas

echo "Atualização concluída!"
```

---

## 🔐 SEGURANÇA ADICIONAL

### 1. Configurar Fail2Ban para Nginx
```bash
sudo nano /etc/fail2ban/jail.local
```

**Adicionar:**
```ini
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
```

### 2. Configurar Rate Limiting no Nginx
```nginx
# Adicionar no bloco http do nginx.conf
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # No server block
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        # ... resto da configuração
    }
    
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        # ... resto da configuração
    }
}
```

### 3. Headers de Segurança
```nginx
# Adicionar no server block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

---

## 🌍 CONFIGURAR DOMÍNIO

### 1. DNS Records
Configure no seu provedor de domínio:
```
Type    Name    Value           TTL
A       @       IP-DA-VPS       300
A       www     IP-DA-VPS       300
CNAME   admin   seudominio.com  300
```

### 2. Aguardar Propagação
```bash
# Verificar propagação DNS
nslookup seudominio.com
dig seudominio.com
```

---

## 📝 MODIFICAÇÕES NECESSÁRIAS

### 1. Frontend - Configuração de Produção
```bash
# Criar .env.production
nano .env.production
```

```env
VITE_API_URL=https://seudominio.com/api
VITE_SOCKET_URL=https://seudominio.com
```

### 2. Backend - Configuração de Produção
```env
# No server/.env
NODE_ENV=production
CORS_ORIGIN=https://seudominio.com
```

### 3. Build para Produção
```bash
# Build com configuração de produção
npm run build
```

---

## 🔄 SCRIPTS DE AUTOMAÇÃO

### 1. Script de Deploy Completo
```bash
nano /home/usuario/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# Variáveis
APP_DIR="/home/usuario/ai-agents-saas"
BACKUP_DIR="/home/usuario/backups"

cd $APP_DIR

# Backup
echo "📦 Fazendo backup..."
./backup-db.sh

# Parar aplicação
echo "⏹️ Parando aplicação..."
pm2 stop ai-agents-saas

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm install
cd server && npm install && cd ..

# Build
echo "🔨 Fazendo build..."
npm run build

# Reiniciar aplicação
echo "🚀 Reiniciando aplicação..."
pm2 restart ai-agents-saas

# Verificar status
echo "✅ Verificando status..."
pm2 status

echo "🎉 Deploy concluído!"
```

### 2. Script de Monitoramento
```bash
nano /home/usuario/monitor.sh
```

```bash
#!/bin/bash

# Verificar se aplicação está rodando
if ! pm2 list | grep -q "ai-agents-saas.*online"; then
    echo "❌ Aplicação offline! Reiniciando..."
    pm2 restart ai-agents-saas
    echo "📧 Enviando alerta..." # Implementar notificação
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ Espaço em disco baixo: ${DISK_USAGE}%"
fi

# Verificar memória
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "⚠️ Memória alta: ${MEM_USAGE}%"
fi

# Verificar logs de erro
ERROR_COUNT=$(tail -100 /home/usuario/ai-agents-saas/logs/err.log | wc -l)
if [ $ERROR_COUNT -gt 10 ]; then
    echo "⚠️ Muitos erros detectados: $ERROR_COUNT"
fi
```

### 3. Agendar Monitoramento
```bash
# Adicionar ao crontab
crontab -e

# Adicionar linhas:
0 2 * * * /home/usuario/backup-db.sh
*/5 * * * * /home/usuario/monitor.sh
0 0 * * 0 /home/usuario/ai-agents-saas && npm audit fix
```

---

## 🔧 OTIMIZAÇÕES DE PERFORMANCE

### 1. Configurar Gzip no Nginx
```nginx
# Adicionar no nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;
```

### 2. Cache de Arquivos Estáticos
```nginx
# Adicionar no location /
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Configurar MySQL para Performance
```sql
-- Otimizações MySQL
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL query_cache_size = 67108864; -- 64MB
SET GLOBAL max_connections = 200;
```

---

## 📊 MONITORAMENTO AVANÇADO

### 1. Instalar Htop
```bash
sudo apt install htop -y
```

### 2. Configurar Logrotate
```bash
sudo nano /etc/logrotate.d/ai-agents-saas
```

```
/home/usuario/ai-agents-saas/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 usuario usuario
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Alertas por Email (Opcional)
```bash
# Instalar mailutils
sudo apt install mailutils -y

# Configurar no script de monitoramento
echo "Erro detectado" | mail -s "Alerta AI Agents" admin@seudominio.com
```

---

## 🔄 PROCESSO DE ATUALIZAÇÃO

### 1. Preparação
```bash
# Fazer backup completo
./backup-db.sh

# Verificar status atual
pm2 status
```

### 2. Atualização
```bash
# Executar script de deploy
./deploy.sh
```

### 3. Verificação
```bash
# Verificar logs
pm2 logs --lines 50

# Testar endpoints
curl https://seudominio.com/api/health

# Verificar frontend
curl -I https://seudominio.com
```

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### Aplicação Não Inicia
```bash
# Verificar logs
pm2 logs ai-agents-saas

# Verificar configuração
pm2 describe ai-agents-saas

# Reiniciar
pm2 restart ai-agents-saas
```

### Erro de Banco de Dados
```bash
# Verificar status MySQL
sudo systemctl status mysql

# Verificar logs MySQL
sudo tail -f /var/log/mysql/error.log

# Testar conexão
mysql -u aiagents -p ai_agents_saas_main
```

### Erro de Nginx
```bash
# Verificar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar
sudo systemctl restart nginx
```

### Alto Uso de Recursos
```bash
# Verificar processos
htop

# Verificar logs da aplicação
pm2 logs

# Reiniciar se necessário
pm2 restart ai-agents-saas
```

---

## 📋 CHECKLIST DE DEPLOY

### Antes do Deploy
- [ ] VPS configurada e acessível
- [ ] Domínio apontando para VPS
- [ ] MySQL instalado e configurado
- [ ] Node.js 18+ instalado
- [ ] Nginx instalado

### Durante o Deploy
- [ ] Código transferido
- [ ] Dependências instaladas
- [ ] .env configurado
- [ ] Banco de dados criado
- [ ] Build realizado
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] PM2 configurado

### Após o Deploy
- [ ] Aplicação rodando (pm2 status)
- [ ] Frontend acessível
- [ ] API respondendo
- [ ] Admin panel funcionando
- [ ] Logs sem erros críticos
- [ ] Backup configurado
- [ ] Monitoramento ativo

---

## 🎯 URLS FINAIS

Após o deploy completo:

- **Frontend**: https://seudominio.com
- **API**: https://seudominio.com/api
- **Admin**: https://seudominio.com/admin
- **Health**: https://seudominio.com/api/health
- **WhatsApp Webhook**: https://seudominio.com/api/whatsapp/webhook

---

## 💰 CUSTOS ESTIMADOS

### VPS Mensal
- **Básico**: $12-20/mês (2GB RAM, 1 vCPU)
- **Recomendado**: $20-40/mês (4GB RAM, 2 vCPU)
- **Premium**: $40-80/mês (8GB RAM, 4 vCPU)

### Domínio
- **Registro**: $10-15/ano
- **SSL**: Gratuito (Let's Encrypt)

### APIs Externas
- **OpenAI**: $0.002/1K tokens
- **Google Gemini**: $0.00025/1K tokens
- **WhatsApp**: $0.005-0.009/mensagem

---

**🎉 SISTEMA PRONTO PARA PRODUÇÃO!**

Siga este tutorial passo a passo para ter sua plataforma funcionando em uma VPS com todas as funcionalidades ativas.