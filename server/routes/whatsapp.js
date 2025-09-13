const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

// Webhook verification (sem auth)
router.get('/webhook', whatsappController.verifyWebhook);
router.post('/webhook', whatsappController.handleWebhook);

// Rotas protegidas
router.use(authMiddleware);

router.post('/send', whatsappController.sendMessage);
router.get('/sessions', whatsappController.getSessions);
router.post('/sessions/:id/assign', whatsappController.assignAgent);

module.exports = router;