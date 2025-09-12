const jwt = require('jsonwebtoken');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.connectedAgents = new Map(); // agentId -> socketId
    this.activeSessions = new Map(); // sessionId -> { agentId, userId, socketIds }
    
    this.setupSocketAuthentication();
    this.setupEventHandlers();
  }

  setupSocketAuthentication() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.userId} connected: ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      
      // Join user-specific room
      socket.join(`user-${socket.userId}`);
      
      // Join admin room if user is admin
      if (socket.userRole === 'admin') {
        socket.join('admin-room');
        console.log(`👑 Admin ${socket.userId} joined admin room`);
      }
      
      // Join agent room if user is agent
      if (socket.userRole === 'agent') {
        this.connectedAgents.set(socket.userId, socket.id);
        socket.join('agents-room');
        socket.join(`agent-${socket.userId}`);
        console.log(`🤖 Agent ${socket.userId} joined agent room`);
        
        // Notify admin about agent online status
        this.emitToAdmins('agent-status-changed', {
          agentId: socket.userId,
          status: 'online',
          timestamp: new Date()
        });
      }

      // WhatsApp session events
      socket.on('join-whatsapp-session', (sessionId) => {
        socket.join(`whatsapp-session-${sessionId}`);
        console.log(`📱 User ${socket.userId} joined WhatsApp session ${sessionId}`);
        
        // Track active session
        if (!this.activeSessions.has(sessionId)) {
          this.activeSessions.set(sessionId, {
            agentId: socket.userRole === 'agent' ? socket.userId : null,
            userId: socket.userId,
            socketIds: [socket.id]
          });
        } else {
          const session = this.activeSessions.get(sessionId);
          if (!session.socketIds.includes(socket.id)) {
            session.socketIds.push(socket.id);
          }
          if (socket.userRole === 'agent') {
            session.agentId = socket.userId;
          }
        }
      });

      socket.on('leave-whatsapp-session', (sessionId) => {
        socket.leave(`whatsapp-session-${sessionId}`);
        console.log(`📱 User ${socket.userId} left WhatsApp session ${sessionId}`);
        
        // Update active session
        if (this.activeSessions.has(sessionId)) {
          const session = this.activeSessions.get(sessionId);
          session.socketIds = session.socketIds.filter(id => id !== socket.id);
          
          if (session.socketIds.length === 0) {
            this.activeSessions.delete(sessionId);
          }
        }
      });

      // Agent typing indicators
      socket.on('agent-typing', (data) => {
        socket.to(`whatsapp-session-${data.sessionId}`).emit('agent-typing', {
          agentId: socket.userId,
          sessionId: data.sessionId,
          isTyping: data.isTyping
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User ${socket.userId} disconnected: ${socket.id}`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.userId);
        
        // Handle agent disconnection
        if (socket.userRole === 'agent') {
          this.connectedAgents.delete(socket.userId);
          
          // Notify admin about agent offline status
          this.emitToAdmins('agent-status-changed', {
            agentId: socket.userId,
            status: 'offline',
            timestamp: new Date()
          });
        }
        
        // Clean up active sessions
        for (const [sessionId, session] of this.activeSessions.entries()) {
          session.socketIds = session.socketIds.filter(id => id !== socket.id);
          if (session.socketIds.length === 0) {
            this.activeSessions.delete(sessionId);
          }
        }
      });
    });
  }

  // WhatsApp specific methods
  emitNewWhatsAppMessage(sessionId, messageData) {
    // Emit to all users in the session
    this.io.to(`whatsapp-session-${sessionId}`).emit('whatsapp-message-received', messageData);
    
    // Emit to admins for monitoring
    this.emitToAdmins('whatsapp-message-received', {
      ...messageData,
      sessionId
    });
  }

  emitSessionStatusChange(sessionId, status, data = {}) {
    const eventData = {
      sessionId,
      status,
      timestamp: new Date(),
      ...data
    };
    
    // Emit to session participants
    this.io.to(`whatsapp-session-${sessionId}`).emit('session-status-changed', eventData);
    
    // Emit to admins
    this.emitToAdmins('session-status-changed', eventData);
  }

  emitAgentAssignment(sessionId, agentId, customerPhone) {
    const eventData = {
      sessionId,
      agentId,
      customerPhone,
      timestamp: new Date()
    };
    
    // Notify the assigned agent
    this.io.to(`agent-${agentId}`).emit('session-assigned', eventData);
    
    // Notify session participants
    this.io.to(`whatsapp-session-${sessionId}`).emit('agent-assigned', eventData);
    
    // Notify admins
    this.emitToAdmins('agent-assigned', eventData);
  }

  emitSessionTransfer(sessionId, fromAgentId, toAgentId, reason) {
    const eventData = {
      sessionId,
      fromAgentId,
      toAgentId,
      reason,
      timestamp: new Date()
    };
    
    // Notify both agents
    this.io.to(`agent-${fromAgentId}`).emit('session-transferred-out', eventData);
    this.io.to(`agent-${toAgentId}`).emit('session-transferred-in', eventData);
    
    // Notify session participants
    this.io.to(`whatsapp-session-${sessionId}`).emit('session-transferred', eventData);
    
    // Notify admins
    this.emitToAdmins('session-transferred', eventData);
  }

  // Emit conversation transferred event
  emitConversationTransferred(conversationId, transferData) {
    console.log('📤 Emitting conversation transferred:', { conversationId, transferData });
    
    const { fromAgentId, toAgentId, reason, notes, transferId } = transferData;
    
    const eventData = {
      conversationId,
      fromAgentId,
      toAgentId,
      reason,
      notes,
      transferId,
      timestamp: new Date()
    };
    
    // Notify the conversation room
    this.io.to(`conversation-${conversationId}`).emit('conversation-transferred', eventData);
    
    // Notify the previous agent
    this.emitToAgent(fromAgentId, 'conversation-transferred-out', eventData);
    
    // Notify the new agent
    this.emitToAgent(toAgentId, 'conversation-transferred-in', eventData);
    
    // Notify admins and supervisors
    this.emitToAdmins('conversation-transferred', eventData);
    
    // Notify all agents in the agents room
    this.emitToAgents('conversation-transferred', eventData);
  }

  // Utility methods
  emitToAdmins(event, data) {
    this.io.to('admin-room').emit(event, data);
  }

  emitToAgents(event, data) {
    this.io.to('agents-room').emit(event, data);
  }

  emitToUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }

  emitToAgent(agentId, event, data) {
    this.io.to(`agent-${agentId}`).emit(event, data);
  }

  isAgentOnline(agentId) {
    return this.connectedAgents.has(agentId);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  getOnlineAgentsCount() {
    return this.connectedAgents.size;
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get real-time stats
  getRealTimeStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      onlineAgents: this.connectedAgents.size,
      activeSessions: this.activeSessions.size,
      timestamp: new Date()
    };
  }
}

module.exports = SocketService;