-- Migration: Create system_settings table
-- Description: Table to store system configuration settings
-- Created: 2024

CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_category_key (category, `key`),
    INDEX idx_category (category)
);

-- Insert default settings
INSERT INTO system_settings (category, `key`, value, description) VALUES
-- General Settings
('general', 'site_name', '"SaaS Agente IA"', 'Nome do site'),
('general', 'site_description', '"Plataforma de Agentes de IA para WhatsApp"', 'Descrição do site'),
('general', 'timezone', '"America/Sao_Paulo"', 'Fuso horário do sistema'),
('general', 'language', '"pt-BR"', 'Idioma padrão do sistema'),
('general', 'maintenance_mode', 'false', 'Modo de manutenção ativo'),

-- Integration Settings
('integrations', 'whatsapp_api_url', '""', 'URL da API do WhatsApp'),
('integrations', 'whatsapp_token', '""', 'Token de acesso do WhatsApp'),
('integrations', 'stripe_public_key', '""', 'Chave pública do Stripe'),
('integrations', 'stripe_secret_key', '""', 'Chave secreta do Stripe'),
('integrations', 'openai_api_key', '""', 'Chave da API OpenAI'),
('integrations', 'smtp_host', '""', 'Servidor SMTP'),
('integrations', 'smtp_port', '587', 'Porta do servidor SMTP'),
('integrations', 'smtp_user', '""', 'Usuário SMTP'),
('integrations', 'smtp_password', '""', 'Senha SMTP'),

-- Email Templates
('email_templates', 'welcome_email', '{"subject":"Bem-vindo ao SaaS Agente IA","body":"Olá {{name}}, bem-vindo à nossa plataforma!"}', 'Template de email de boas-vindas'),
('email_templates', 'password_reset', '{"subject":"Redefinição de Senha","body":"Clique no link para redefinir sua senha: {{reset_link}}"}', 'Template de email de redefinição de senha'),
('email_templates', 'invoice_email', '{"subject":"Nova Fatura - {{invoice_number}}","body":"Sua fatura no valor de {{amount}} está disponível."}', 'Template de email de fatura')

ON DUPLICATE KEY UPDATE
    value = VALUES(value),
    updated_at = CURRENT_TIMESTAMP;