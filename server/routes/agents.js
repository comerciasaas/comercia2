const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const agentController = require('../controllers/agentController');
const { validateAgent, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// Rotas de agentes
router.get('/', validatePagination, agentController.getAll);
router.post('/', validateAgent, agentController.create);
router.get('/stats', agentController.getStats);
router.get('/:id', agentController.getById);
router.put('/:id', agentController.update);
router.delete('/:id', agentController.delete);

module.exports = router;