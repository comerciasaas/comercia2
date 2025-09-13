const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// Rotas de chat
router.post('/send', chatController.sendMessage);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations', chatController.createConversation);
router.get('/knowledge', chatController.searchKnowledge);
router.post('/knowledge', chatController.addKnowledge);

module.exports = router;