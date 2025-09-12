v-- Migration: Create Support and Tickets Tables
-- Description: Creates tables for support ticket system
-- Date: 2024-01-15

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    category ENUM('technical', 'billing', 'support', 'feature_request', 'general') DEFAULT 'general',
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_created_at (created_at)
);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('user', 'admin', 'system') NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_sender (sender_id, sender_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    message_id INT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_message_id (message_id),
    INDEX idx_uploaded_by (uploaded_by),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE
);

-- Create support_categories table for dynamic categories
CREATE TABLE IF NOT EXISTS support_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default support categories
INSERT INTO support_categories (name, description, color, sort_order) VALUES
('technical', 'Problemas técnicos e bugs', '#EF4444', 1),
('billing', 'Questões de faturamento e pagamento', '#F59E0B', 2),
('support', 'Suporte geral e dúvidas', '#10B981', 3),
('feature_request', 'Solicitações de novos recursos', '#3B82F6', 4),
('general', 'Assuntos gerais', '#6B7280', 5)
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    color = VALUES(color),
    sort_order = VALUES(sort_order);

-- Create support_templates table for response templates
CREATE TABLE IF NOT EXISTS support_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created_by (created_by)
);

-- Insert default support templates
INSERT INTO support_templates (name, subject, content, category, created_by) VALUES
('Boas-vindas', 'Bem-vindo ao nosso suporte!', 'Olá! Obrigado por entrar em contato conosco. Recebemos sua solicitação e nossa equipe irá analisá-la em breve. Nosso tempo médio de resposta é de 2-4 horas durante o horário comercial.', 'general', 1),
('Problema Técnico', 'Investigando problema técnico', 'Olá! Recebemos seu relato sobre o problema técnico. Nossa equipe de desenvolvimento está investigando a questão. Manteremos você informado sobre o progresso da resolução.', 'technical', 1),
('Questão de Faturamento', 'Sobre sua questão de faturamento', 'Olá! Recebemos sua consulta sobre faturamento. Nossa equipe financeira irá revisar sua conta e retornar com as informações solicitadas em até 24 horas.', 'billing', 1),
('Solicitação de Recurso', 'Sua sugestão foi recebida', 'Olá! Agradecemos sua sugestão de novo recurso. Nossa equipe de produto irá avaliar a viabilidade e incluir em nosso roadmap de desenvolvimento. Manteremos você informado sobre o status.', 'feature_request', 1),
('Resolução', 'Ticket resolvido', 'Olá! Esperamos que sua questão tenha sido resolvida satisfatoriamente. Se você tiver mais alguma dúvida ou precisar de assistência adicional, não hesite em nos contatar novamente.', 'general', 1)
ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    content = VALUES(content),
    category = VALUES(category);

-- Insert sample support tickets for testing
INSERT INTO support_tickets (user_id, subject, description, status, priority, category, created_at, updated_at) VALUES
(1, 'Problema com integração WhatsApp', 'Estou tendo dificuldades para configurar a integração com WhatsApp Business API. O webhook não está recebendo as mensagens corretamente.', 'open', 'high', 'technical', '2024-01-15 10:30:00', '2024-01-15 14:20:00'),
(2, 'Dúvida sobre planos de assinatura', 'Gostaria de entender melhor as diferenças entre os planos Basic e Pro. Qual seria o mais adequado para minha empresa?', 'in_progress', 'medium', 'billing', '2024-01-14 16:45:00', '2024-01-15 09:15:00'),
(3, 'Solicitação de novo recurso', 'Seria possível adicionar a funcionalidade de agendamento de mensagens? Isso seria muito útil para campanhas de marketing.', 'resolved', 'low', 'feature_request', '2024-01-13 11:20:00', '2024-01-14 15:30:00'),
(1, 'Erro ao criar novo agente', 'Quando tento criar um novo agente de IA, recebo uma mensagem de erro "Falha na conexão com o servidor". Já tentei várias vezes.', 'open', 'high', 'technical', '2024-01-15 08:15:00', '2024-01-15 08:15:00'),
(4, 'Como configurar webhook', 'Preciso de ajuda para configurar o webhook corretamente. Tenho dúvidas sobre os parâmetros necessários e a estrutura da URL.', 'in_progress', 'medium', 'support', '2024-01-12 14:30:00', '2024-01-15 11:45:00')
ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    description = VALUES(description),
    status = VALUES(status),
    priority = VALUES(priority),
    category = VALUES(category);

-- Insert sample ticket messages
INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, message, created_at) VALUES
(1, 1, 'user', 'Preciso de ajuda urgente com a configuração do WhatsApp. Meus clientes não estão recebendo as respostas automáticas.', '2024-01-15 10:30:00'),
(1, 1, 'admin', 'Olá! Entendo sua urgência. Vou verificar as configurações do seu webhook. Pode me enviar a URL que você está usando?', '2024-01-15 11:15:00'),
(1, 1, 'user', 'Claro! A URL é: https://meusite.com/webhook/whatsapp', '2024-01-15 11:20:00'),
(2, 2, 'user', 'Gostaria de saber mais sobre os recursos incluídos em cada plano.', '2024-01-14 16:45:00'),
(2, 1, 'admin', 'Olá Maria! Vou te explicar as principais diferenças entre nossos planos...', '2024-01-14 17:30:00'),
(3, 3, 'user', 'Seria muito útil ter a opção de agendar mensagens para envio posterior.', '2024-01-13 11:20:00'),
(3, 1, 'admin', 'Excelente sugestão! Vou encaminhar para nossa equipe de produto.', '2024-01-13 14:45:00'),
(3, 1, 'admin', 'Boa notícia! Implementamos a funcionalidade de agendamento. Já está disponível na versão mais recente.', '2024-01-14 15:30:00')
ON DUPLICATE KEY UPDATE
    message = VALUES(message);

-- Create triggers for automatic timestamp updates
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Set resolved_at when status changes to resolved
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        SET NEW.resolved_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Set closed_at when status changes to closed
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        SET NEW.closed_at = CURRENT_TIMESTAMP;
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS update_message_timestamp
    BEFORE UPDATE ON ticket_messages
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_created ON ticket_messages(ticket_id, created_at);

-- Create view for ticket statistics
CREATE OR REPLACE VIEW ticket_stats AS
SELECT 
    COUNT(*) as total_tickets,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tickets,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN 
        TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
        ELSE NULL END) as avg_resolution_time_hours,
    AVG(CASE WHEN status IN ('resolved', 'closed') THEN 
        TIMESTAMPDIFF(HOUR, created_at, updated_at) 
        ELSE NULL END) as avg_response_time_hours
FROM support_tickets;

-- Create view for category statistics
CREATE OR REPLACE VIEW category_stats AS
SELECT 
    category,
    COUNT(*) as ticket_count,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN 
        TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
        ELSE NULL END) as avg_resolution_time
FROM support_tickets
GROUP BY category;

-- Create view for priority statistics
CREATE OR REPLACE VIEW priority_stats AS
SELECT 
    priority,
    COUNT(*) as ticket_count,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN 
        TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
        ELSE NULL END) as avg_resolution_time
FROM support_tickets
GROUP BY priority;