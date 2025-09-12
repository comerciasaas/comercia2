const express = require('express');
const agentController = require('../controllers/agentController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateAgent, 
  validateAgentUpdate 
} = require('../middleware/validation');

const router = express.Router();

router.use(authMiddleware);

router.post('/', validateAgent, agentController.create);
router.get('/', agentController.getAll);
router.get('/stats', agentController.getStats);
router.get('/:id', agentController.getById);
router.put('/:id', validateAgentUpdate, agentController.update);
router.delete('/:id', agentController.delete);

module.exports = router;