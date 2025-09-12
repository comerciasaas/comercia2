-- Migration: Create whatsapp_sessions table
-- Description: Table to store WhatsApp session data
-- Created: 2024

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    contact_name VARCHAR(255),
    agent_id INT,
    status ENUM('active', 'inactive', 'ended') DEFAULT 'active',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_phone_number (phone_number),
    INDEX idx_agent_id (agent_id),
    INDEX idx_status (status),
    INDEX idx_last_activity (last_activity),
    
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Insert some sample data for testing
INSERT IGNORE INTO whatsapp_sessions (phone_number, contact_name, agent_id, status, metadata) VALUES
('+5511999999999', 'João Silva', 1, 'active', '{"source": "whatsapp_web", "device": "desktop"}'),
('+5511888888888', 'Maria Santos', 1, 'active', '{"source": "whatsapp_mobile", "device": "mobile"}'),
('+5511777777777', 'Pedro Costa', NULL, 'inactive', '{"source": "whatsapp_web", "device": "desktop"}');

-- Create audit trigger for whatsapp_sessions
DELIMITER //
CREATE TRIGGER IF NOT EXISTS whatsapp_sessions_audit_insert
AFTER INSERT ON whatsapp_sessions
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
    VALUES (NEW.agent_id, 'create', 'whatsapp_session', NEW.id, 
            JSON_OBJECT('phone_number', NEW.phone_number, 'contact_name', NEW.contact_name), 
            NOW());
END//

CREATE TRIGGER IF NOT EXISTS whatsapp_sessions_audit_update
AFTER UPDATE ON whatsapp_sessions
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
    VALUES (COALESCE(NEW.agent_id, OLD.agent_id), 'update', 'whatsapp_session', NEW.id,
            JSON_OBJECT('old_status', OLD.status, 'new_status', NEW.status,
                       'old_agent_id', OLD.agent_id, 'new_agent_id', NEW.agent_id),
            NOW());
END//

CREATE TRIGGER IF NOT EXISTS whatsapp_sessions_audit_delete
AFTER DELETE ON whatsapp_sessions
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
    VALUES (OLD.agent_id, 'delete', 'whatsapp_session', OLD.id,
            JSON_OBJECT('phone_number', OLD.phone_number, 'contact_name', OLD.contact_name),
            NOW());
END//
DELIMITER ;