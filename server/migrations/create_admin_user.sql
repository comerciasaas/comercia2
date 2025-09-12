-- Criar usuário administrador padrão
-- Email: admin@admin.com
-- Senha: admin123 (hash bcrypt)

-- Inserir usuário administrador
INSERT INTO users (
  name,
  email,
  password,
  role,
  is_active,
  email_verified,
  created_at,
  updated_at
) VALUES (
  'Administrador',
  'admin@admin.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Hash para 'admin123'
  'admin',
  true,
  true,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  role = 'admin',
  is_active = true,
  email_verified = true,
  updated_at = NOW();

-- Verificar se o usuário foi criado
SELECT 
  id,
  name,
  email,
  role,
  is_active,
  email_verified,
  created_at
FROM users 
WHERE email = 'admin@admin.com';

-- Inserir log de auditoria para criação do usuário admin
INSERT INTO audit_logs (
  user_id,
  action,
  resource_type,
  resource_id,
  details,
  ip_address,
  user_agent,
  created_at
) VALUES (
  (SELECT id FROM users WHERE email = 'admin@admin.com'),
  'create',
  'user',
  (SELECT id FROM users WHERE email = 'admin@admin.com'),
  JSON_OBJECT(
    'action', 'admin_user_created',
    'email', 'admin@admin.com',
    'role', 'admin',
    'created_by', 'system'
  ),
  '127.0.0.1',
  'System Migration',
  NOW()
);