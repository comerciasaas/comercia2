# 🚀 TUTORIAL - EXECUTAR LOCALMENTE

## 📋 PRÉ-REQUISITOS

### 1. Instalar Node.js
```bash
# Baixar e instalar Node.js 18+ de https://nodejs.org/
node --version  # Verificar instalação
npm --version   # Verificar npm
```

### 2. Instalar MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS
brew install mysql

# Windows
# Baixar de https://dev.mysql.com/downloads/mysql/
```

### 3. Configurar MySQL
```bash
# Iniciar MySQL
sudo systemctl start mysql      # Linux
brew services start mysql       # macOS

# Configurar MySQL (opcional)
sudo mysql_secure_installation

# Acessar MySQL
mysql -u root -p
```

---

## 🛠️ INSTALAÇÃO E CONFIGURAÇÃO

### 1. Clonar/Baixar o Projeto
```bash
# Se usando Git
git clone <url-do-repositorio>
cd ai-agents-saas

# Ou extrair arquivo ZIP
```

### 2. Instalar Dependências
```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do backend
cd server
npm install
cd ..
```

### 3. Configurar Banco de Dados
```bash
# Copiar arquivo de configuração
cd server
cp .env.example .env

# Editar .env com suas configurações
nano .env  # ou use seu editor preferido
```

**Configurar no arquivo `.env`:**
```env
# Database - OBRIGATÓRIO
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=ai_agents_saas_main

# JWT - OBRIGATÓRIO
JWT_SECRET=sua_chave_jwt_super_secreta_aqui

# APIs de IA - OPCIONAL (para testar IA)
OPENAI_API_KEY=sk-proj-sua-chave-openai
GOOGLE_GEMINI_API_KEY=sua-chave-gemini
HUGGINGFACE_API_KEY=hf_sua-chave-huggingface

# WhatsApp - OPCIONAL (para WhatsApp)
WHATSAPP_ACCESS_TOKEN=seu-token-whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu-verify-token
```

### 4. Executar Setup do Banco
```bash
# Dentro da pasta server
npm run setup-db
```

**Este comando irá:**
- Criar o banco principal `ai_agents_saas_main`
- Criar todas as tabelas necessárias
- Criar usuário administrador padrão
- Configurar índices e relacionamentos

---

## 🚀 EXECUTAR O SISTEMA

### 1. Iniciar Backend
```bash
cd server
npm run dev
# Ou para produção: npm start
```

**Saída esperada:**
```
✅ MySQL Connected Successfully
🚀 ===================================
🚀 AI Agents SaaS Server Running
🚀 Port: 3001
🚀 Environment: development
🚀 ===================================
📊 Admin Panel: http://localhost:3001/admin
🔗 API Health: http://localhost:3001/api/health
🌐 Frontend: http://localhost:5173
🚀 ===================================
```

### 2. Iniciar Frontend (Nova aba do terminal)
```bash
npm run dev
```

**Saída esperada:**
```
  VITE v5.4.2  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## 🔑 ACESSAR O SISTEMA

### 1. Frontend Principal
- **URL**: http://localhost:5173
- **Primeiro Acesso**: Criar conta em "Registrar"
- **Login**: Use as credenciais criadas

### 2. Painel Administrativo
- **URL**: http://localhost:3001/admin
- **Email**: admin@admin.com
- **Senha**: admin123

### 3. API Health Check
- **URL**: http://localhost:3001/api/health
- **Resposta**: Status do sistema

---

## 🧪 TESTAR FUNCIONALIDADES

### 1. Testar Registro/Login
1. Acesse http://localhost:5173
2. Clique em "Criar conta"
3. Preencha os dados
4. Faça login

### 2. Testar Criação de Agente
1. Vá para "Agentes de IA"
2. Clique "Novo Agente"
3. Preencha os dados
4. Salve

### 3. Testar Chat com IA
1. Configure uma API de IA no .env
2. Reinicie o servidor
3. Vá para "Chat IA"
4. Selecione um agente
5. Inicie conversa
6. Teste mensagens

### 4. Testar Painel Admin
1. Acesse http://localhost:3001/admin
2. Faça login como admin
3. Visualize usuários
4. Veja logs de auditoria

---

## 🔧 CONFIGURAR APIS DE IA

### OpenAI ChatGPT
1. Acesse https://platform.openai.com/
2. Crie uma conta
3. Vá para API Keys
4. Gere uma nova chave
5. Adicione no .env: `OPENAI_API_KEY=sk-proj-sua-chave`

### Google Gemini
1. Acesse https://makersuite.google.com/app/apikey
2. Crie um projeto
3. Gere API Key
4. Adicione no .env: `GOOGLE_GEMINI_API_KEY=sua-chave`

### Hugging Face
1. Acesse https://huggingface.co/
2. Crie conta
3. Vá para Settings > Access Tokens
4. Gere token
5. Adicione no .env: `HUGGINGFACE_API_KEY=hf_sua-chave`

---

## 📱 CONFIGURAR WHATSAPP

### 1. Facebook Developers
1. Acesse https://developers.facebook.com/
2. Crie um app "WhatsApp Business"
3. Configure o produto WhatsApp

### 2. Configurar Webhook
- **URL**: `http://localhost:3001/api/whatsapp/webhook`
- **Verify Token**: Defina um token no .env
- **Campos**: messages, message_deliveries

### 3. Obter Credenciais
- **Access Token**: Da página do app
- **Phone Number ID**: Do número de teste
- **Verify Token**: O que você definiu

### 4. Adicionar no .env
```env
WHATSAPP_ACCESS_TOKEN=seu-token
WHATSAPP_PHONE_NUMBER_ID=seu-phone-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu-verify-token
```

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### Erro de Conexão MySQL
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Iniciar MySQL se parado
sudo systemctl start mysql

# Verificar credenciais
mysql -u root -p
```

### Erro de Permissões MySQL
```sql
-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Porta em Uso
```bash
# Verificar processo na porta
lsof -i :3001
lsof -i :5173

# Matar processo se necessário
kill -9 PID
```

### Erro de Dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install

# Para o servidor
cd server
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 VERIFICAR SE ESTÁ FUNCIONANDO

### 1. Checklist Backend
- [ ] MySQL conectado (log no terminal)
- [ ] Servidor rodando na porta 3001
- [ ] Health check: http://localhost:3001/api/health
- [ ] Admin panel: http://localhost:3001/admin

### 2. Checklist Frontend
- [ ] Vite rodando na porta 5173
- [ ] Página carrega sem erros
- [ ] Login funciona
- [ ] Dashboard carrega

### 3. Checklist Funcionalidades
- [ ] Criar agente funciona
- [ ] Chat IA responde (se API configurada)
- [ ] WhatsApp configurado (se credenciais)
- [ ] Painel admin acessível

---

## 📝 LOGS IMPORTANTES

### Logs do Servidor
```bash
# Ver logs em tempo real
cd server
npm run dev

# Logs importantes:
✅ MySQL Connected Successfully
🚀 AI Agents SaaS Server Running
📊 Admin Panel: http://localhost:3001/admin
```

### Logs do Frontend
```bash
# Ver logs do Vite
npm run dev

# Logs importantes:
➜  Local:   http://localhost:5173/
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Configurar APIs de IA** para testar chat
2. **Configurar WhatsApp** para integração real
3. **Testar todas as funcionalidades**
4. **Adicionar conhecimento na base RAG**
5. **Configurar para produção** (próximo tutorial)

---

**✅ SISTEMA PRONTO PARA USO LOCAL!**

Para dúvidas ou problemas, verifique os logs do servidor e do frontend.