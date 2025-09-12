const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { auditMiddleware, performanceMonitor } = require('../middleware/audit');

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);
router.use(performanceMonitor);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', auditMiddleware('create', 'user'), adminController.createUser);
router.put('/users/:id', auditMiddleware('update', 'user'), adminController.updateUser);
router.delete('/users/:id', auditMiddleware('delete', 'user'), adminController.deleteUser);
router.post('/users/:id/reset-password', auditMiddleware('reset-password', 'user'), adminController.resetUserPassword);

// Agent Management
router.get('/agents', adminController.getAllAgents);
router.post('/agents', auditMiddleware('create', 'agent'), adminController.createAgent);
router.put('/agents/:id', auditMiddleware('update', 'agent'), adminController.updateAgent);
router.delete('/agents/:id', auditMiddleware('delete', 'agent'), adminController.deleteAgent);

// Conversation Management
router.get('/conversations', adminController.getAllConversations);
router.post('/conversations', auditMiddleware('create', 'conversation'), adminController.createConversation);
router.put('/conversations/:id', auditMiddleware('update', 'conversation'), adminController.updateConversation);
router.delete('/conversations/:id', auditMiddleware('delete', 'conversation'), adminController.deleteConversation);

// Plans and Payments Management
router.get('/plans', adminController.getAllPlans);
router.post('/plans', auditMiddleware('create', 'plan'), adminController.createPlan);
router.put('/plans/:id', auditMiddleware('update', 'plan'), adminController.updatePlan);
router.delete('/plans/:id', auditMiddleware('delete', 'plan'), adminController.deletePlan);
router.get('/subscriptions', adminController.getAllSubscriptions);
router.get('/payments', adminController.getAllPayments);
router.get('/invoices', adminController.getAllInvoices);
router.post('/invoices/:id/send', adminController.sendInvoice);

// System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings/general', adminController.updateGeneralSettings);
router.put('/settings/integrations', adminController.updateIntegrationSettings);
router.put('/settings/email-templates', adminController.updateEmailTemplates);
router.post('/settings/test/whatsapp', adminController.testWhatsAppConnection);
router.post('/settings/test/email', adminController.testEmailConnection);

// Logs and Audit Management
router.get('/logs/audit', adminController.getAuditLogs);
router.get('/logs/system', adminController.getSystemLogs);
router.get('/logs/security', adminController.getSecurityLogs);
router.get('/logs/export/:type', adminController.exportLogs);
router.delete('/logs/:type', adminController.clearLogs);

// Advanced Reports
router.get('/reports/users', adminController.getUsersReport);
router.get('/reports/revenue', adminController.getRevenueReport);
router.get('/reports/agents', adminController.getAgentsReport);
router.get('/reports/performance', adminController.getPerformanceReport);
router.get('/reports/export/:type', adminController.exportReport);

// System Monitoring
router.get('/system/health', adminController.getSystemHealth);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Alerts Management
router.get('/alerts', adminController.getAlerts);
router.put('/alerts/:id/resolve', adminController.resolveAlert);

// Support and Tickets Management
router.get('/support/tickets', adminController.getSupportTickets);
router.get('/support/stats', adminController.getSupportStats);
router.get('/support/tickets/:id', adminController.getTicketDetails);
router.post('/support/tickets/:id/respond', adminController.respondToTicket);
router.patch('/support/tickets/:id/close', adminController.closeTicket);

module.exports = router;