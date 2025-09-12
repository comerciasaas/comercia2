-- Tabela para registrar transferências de conversas
CREATE TABLE IF NOT EXISTS conversation_transfers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  from_agent_id INT NOT NULL,
  to_agent_id INT NOT NULL,
  reason ENUM('ESCALATION', 'SPECIALIZATION', 'WORKLOAD', 'UNAVAILABLE', 'CUSTOMER_REQUEST', 'TECHNICAL') NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (from_agent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_agent_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_conversation_transfers_conversation (conversation_id),
  INDEX idx_conversation_transfers_from_agent (from_agent_id),
  INDEX idx_conversation_transfers_to_agent (to_agent_id),
  INDEX idx_conversation_transfers_created (created_at)
);

-- Adicionar campos de especialização e capacidade máxima aos usuários
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS specialization VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_conversations INT DEFAULT 10;

-- Tabela de especializações (se não existir)
CREATE TABLE IF NOT EXISTS specializations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices adicionais para otimização
CREATE INDEX IF NOT EXISTS idx_users_specialization ON users(specialization);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_status ON conversations(agent_id, status);

-- Inserir especializações padrão (opcional)
INSERT IGNORE INTO specializations (name, description) VALUES
('Suporte Técnico', 'Especialista em questões técnicas e troubleshooting'),
('Vendas', 'Especialista em vendas e negociação'),
('Atendimento Geral', 'Atendimento geral ao cliente'),
('Supervisor', 'Supervisão e escalação de casos complexos'),
('Financeiro', 'Questões financeiras e cobrança'),
('Produto', 'Especialista em produtos e funcionalidades');

-- Tabela para logs de atividades de transferência
CREATE TABLE IF NOT EXISTS transfer_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transfer_id INT NOT NULL,
  action ENUM('INITIATED', 'ACCEPTED', 'REJECTED', 'COMPLETED') NOT NULL,
  agent_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transfer_id) REFERENCES conversation_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_transfer_logs_transfer (transfer_id),
  INDEX idx_transfer_logs_created (created_at)
);

-- Trigger para atualizar timestamp de conversas quando transferidas
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_conversation_on_transfer
AFTER INSERT ON conversation_transfers
FOR EACH ROW
BEGIN
  UPDATE conversations 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.conversation_id;
END//
DELIMITER ;

-- View para estatísticas de transferência por agente
CREATE OR REPLACE VIEW agent_transfer_stats AS
SELECT 
  u.id as agent_id,
  u.name as agent_name,
  u.specialization,
  COUNT(ct_from.id) as transfers_sent,
  COUNT(ct_to.id) as transfers_received,
  COUNT(CASE WHEN ct_from.reason = 'ESCALATION' THEN 1 END) as escalations_sent,
  COUNT(CASE WHEN ct_to.reason = 'ESCALATION' THEN 1 END) as escalations_received,
  AVG(CASE WHEN ct_from.id IS NOT NULL THEN 
    TIMESTAMPDIFF(MINUTE, c.start_time, ct_from.created_at) 
  END) as avg_handling_time_before_transfer
FROM users u
LEFT JOIN conversation_transfers ct_from ON u.id = ct_from.from_agent_id
LEFT JOIN conversation_transfers ct_to ON u.id = ct_to.to_agent_id
LEFT JOIN conversations c ON ct_from.conversation_id = c.id
WHERE u.role = 'agent'
GROUP BY u.id, u.name, u.specialization;

-- Inserir dados de exemplo para especializações dos agentes existentes
UPDATE users SET 
  specialization = 'Atendimento Geral',
  max_conversations = 15
WHERE role = 'agent' AND specialization IS NULL;

-- Comentários para documentação
ALTER TABLE conversation_transfers COMMENT = 'Registra todas as transferências de conversas entre agentes';
ALTER TABLE transfer_logs COMMENT = 'Log detalhado de ações relacionadas às transferências';
ALTER TABLE specializations COMMENT = 'Tipos de especialização disponíveis para agentes';