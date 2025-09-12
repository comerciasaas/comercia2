const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { validatePagination } = require('../middleware/validation');

const router = express.Router();

// Aplicar middleware de autenticação e admin para todas as rotas
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard administrativo
router.get('/dashboard', adminController.getDashboard);

// Gerenciamento de usuários
router.get('/users', validatePagination, adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Visualização de agentes de todos os usuários
router.get('/agents', validatePagination, adminController.getAllAgents);

// Visualização de conversas de todos os usuários
router.get('/conversations', validatePagination, adminController.getAllConversations);

// Logs de auditoria
router.get('/audit-logs', validatePagination, adminController.getAuditLogs);

// Alertas do sistema
router.get('/alerts', validatePagination, adminController.getAlerts);
router.put('/alerts/:id/resolve', adminController.resolveAlert);

// Saúde do sistema
router.get('/system/health', adminController.getSystemHealth);

// Configurações do sistema
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

module.exports = router;