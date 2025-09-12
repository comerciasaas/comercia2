const Agent = require('../models/Agent');

const agentController = {
  async create(req, res) {
    try {
      const agentData = {
        ...req.body,
        user_id: req.userId
      };

      const agent = await Agent.create(agentData);
      res.status(201).json({
        message: 'Agente criado com sucesso',
        agent
      });
    } catch (error) {
      console.error('Create agent error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAll(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      let agents;
      if (req.userRole === 'admin') {
        agents = await Agent.findAll(parseInt(limit), parseInt(offset));
      } else {
        agents = await Agent.findByUserId(req.userId, parseInt(limit), parseInt(offset));
      }

      res.json({ agents });
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const agent = await Agent.getWithMetrics(id);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agente não encontrado' });
      }

      // Check if user owns this agent (unless admin)
      if (req.userRole !== 'admin' && agent.user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      res.json({ agent });
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if agent exists and user owns it
      const existingAgent = await Agent.findById(id);
      if (!existingAgent) {
        return res.status(404).json({ error: 'Agente não encontrado' });
      }

      if (req.userRole !== 'admin' && existingAgent.user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const agent = await Agent.update(id, updates);
      res.json({
        message: 'Agente atualizado com sucesso',
        agent
      });
    } catch (error) {
      console.error('Update agent error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Check if agent exists and user owns it
      const existingAgent = await Agent.findById(id);
      if (!existingAgent) {
        return res.status(404).json({ error: 'Agente não encontrado' });
      }

      if (req.userRole !== 'admin' && existingAgent.user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      await Agent.delete(id);
      res.json({ message: 'Agente excluído com sucesso' });
    } catch (error) {
      console.error('Delete agent error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getStats(req, res) {
    try {
      const stats = await Agent.getStats();
      res.json({ stats });
    } catch (error) {
      console.error('Get agent stats error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = agentController;