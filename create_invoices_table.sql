CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    description TEXT,
    invoice_number VARCHAR(50) UNIQUE,
    due_date DATE,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert some sample data
INSERT INTO invoices (user_id, amount, status, description, invoice_number, due_date) VALUES
(13, 29.90, 'paid', 'Plano Premium - Janeiro 2025', 'INV-2025-001', '2025-01-31'),
(13, 29.90, 'pending', 'Plano Premium - Fevereiro 2025', 'INV-2025-002', '2025-02-28');

SELECT 'Invoices table created successfully' as message;