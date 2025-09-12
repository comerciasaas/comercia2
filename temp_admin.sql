DELETE FROM users WHERE email = 'admin@admin.com';

INSERT INTO users (
    name, 
    email, 
    password, 
    role, 
    plan, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    'Administrador',
    'admin@admin.com',
    '$2b$12$mAhRRRIVflNGlYHQ4otEsOOU.gk3N476xKlY9ZfUt.KPsWf9nICkS',
    'admin',
    'premium',
    1,
    NOW(),
    NOW()
);

SELECT 'Admin user created successfully' as message;