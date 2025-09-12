const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const router = express.Router();

// Endpoint para criar usuário administrador inicial
router.post('/create-admin', async (req, res) => {
  try {
    const { email = 'admin@admin.com', password = 'admin123', name = 'Administrador' } = req.body;
    
    // Verificar se já existe um usuário admin
    const existingAdmin = await executeQuery(
      'SELECT id FROM users WHERE email = ? OR role = "admin"',
      [email]
    );
    
    if (existingAdmin && existingAdmin.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Usuário administrador já existe'
      });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário administrador
    const result = await executeQuery(
      `INSERT INTO users (
        name, email, password, role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, 'admin', true, NOW(), NOW())`,
      [name, email, hashedPassword]
    );
    
    const userId = result.insertId;
    
    res.json({
      success: true,
      message: 'Usuário administrador criado com sucesso',
      data: {
        id: userId,
        name,
        email,
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Endpoint para verificar se existe admin
router.get('/check-admin', async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );
    
    const hasAdmin = result[0] && result[0].count > 0;
    
    res.json({
      success: true,
      hasAdmin,
      message: hasAdmin ? 'Administrador já existe' : 'Nenhum administrador encontrado',
      count: result[0] ? result[0].count : 0
    });
    
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;