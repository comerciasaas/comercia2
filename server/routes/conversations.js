const express = require('express');
const Conversation = require('../models/Conversation');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateConversation, 
  validateMessage 
} = require('../middleware/validation');

const router = express.Router();

router.use(authMiddleware);

// Get conversations for user
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      status, 
      channel_type, 
      agent_id, 
      search 
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (channel_type) filters.channel_type = channel_type;
    if (agent_id) filters.agent_id = agent_id;
    if (search) filters.search = search;

    // Non-admin users can only see their own conversations
    if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
      filters.user_id = req.userId;
    }

    const conversations = await Conversation.findAll(parseInt(limit), parseInt(offset), filters);
    
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get conversation by ID with messages
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.getWithMessages(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Check if user owns this conversation (unless admin)
    if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
      // Get agent owner
      const agentQuery = await executeQuery('SELECT user_id FROM agents WHERE id = ?', [conversation.agent_id]);
      if (agentQuery.length === 0 || agentQuery[0].user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new conversation
router.post('/', validateConversation, async (req, res) => {
  try {
    const conversation = await Conversation.create(req.body);
    
    // Emit real-time event
    const io = req.app.get('io');
    io.to('admin-room').emit('conversation-created', conversation);
    io.to(`user-${req.userId}`).emit('conversation-created', conversation);
    
    res.status(201).json({
      success: true,
      message: 'Conversa criada com sucesso',
      conversation
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update conversation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if conversation exists and user owns it
    const existingConversation = await Conversation.findById(id);
    if (!existingConversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
      // Get agent owner
      const agentQuery = await executeQuery('SELECT user_id FROM agents WHERE id = ?', [existingConversation.agent_id]);
      if (agentQuery.length === 0 || agentQuery[0].user_id !== req.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    const conversation = await Conversation.update(id, req.body);
    
    // Emit real-time event
    const io = req.app.get('io');
    io.to('admin-room').emit('conversation-updated', conversation);
    
    res.json({
      success: true,
      message: 'Conversa atualizada com sucesso',
      conversation
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Add message to conversation
router.post('/:id/messages', validateMessage, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type = 'text', sender, metadata = {} } = req.body;
    
    // Check if conversation exists
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Insert message
    const messageQuery = `
      INSERT INTO messages (conversation_id, content, type, sender, metadata)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `;
    
    const messageResult = await executeQuery(messageQuery, [id, content, type, sender, metadata]);
    const message = messageResult[0];
    
    // Update conversation last_message_time
    await executeQuery(
      'UPDATE conversations SET last_message_time = NOW() WHERE id = ?',
      [id]
    );
    
    // Emit real-time event
    const io = req.app.get('io');
    io.to('admin-room').emit('message-received', { conversationId: id, message });
    
    res.status(201).json({
      success: true,
      message: 'Mensagem adicionada com sucesso',
      data: message
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get conversation statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const statsQuery = `
      SELECT 
        COUNT(m.id) as total_messages,
        COUNT(CASE WHEN m.sender = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN m.sender = 'agent' THEN 1 END) as agent_messages,
        AVG(m.response_time) as avg_response_time,
        MIN(m.timestamp) as first_message,
        MAX(m.timestamp) as last_message,
        c.satisfaction_rating,
        c.status,
        TIMESTAMPDIFF(MINUTE, MIN(m.timestamp), MAX(m.timestamp)) as duration_minutes
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = ?
      GROUP BY c.id, c.satisfaction_rating, c.status
    `;
    
    const result = await executeQuery(statsQuery, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    res.json({ success: true, stats: result[0] });
  } catch (error) {
    console.error('Get conversation stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;