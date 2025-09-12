const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');
const { validatePagination } = require('../middleware/validation');

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// Rotas de conversas
router.get('/', validatePagination, conversationController.getAll);
router.post('/', conversationController.create);
router.get('/stats', conversationController.getStats);
router.get('/:id', conversationController.getById);
router.put('/:id', conversationController.update);
router.delete('/:id', conversationController.delete);

module.exports = router;