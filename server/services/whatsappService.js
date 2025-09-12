const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/database');

class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    this.webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.baseUrl = `${process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com'}/${this.apiVersion}`;
    this.appSecret = process.env.WHATSAPP_APP_SECRET;
    
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('WhatsApp credentials not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env file');
    }
  }

  // Verificar webhook do WhatsApp
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('Webhook verificado com sucesso!');
      return challenge;
    }
    return null;
  }

  // Validar assinatura do webhook
  validateSignature(payload, signature) {
    if (!this.appSecret) {
      console.warn('App Secret não configurado - pulando validação de assinatura');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload, 'utf8')
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  // Processar mensagens recebidas
  async processIncomingMessage(webhookData, socketService = null) {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        for (const message of value.messages) {
          await this.handleMessage(message, value.contacts?.[0], value.metadata, socketService);
        }
      }

      if (value?.statuses) {
        for (const status of value.statuses) {
          await this.handleMessageStatus(status);
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem do WhatsApp:', error);
      throw error;
    }
  }

  // Processar mensagem individual
  async handleMessage(message, contact, metadata, socketService = null) {
    try {
      const phoneNumber = message.from;
      const messageText = message.text?.body || '';
      const messageType = message.type;
      const messageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);

      // Buscar ou criar conversa
      const conversation = await this.getOrCreateConversation(phoneNumber, contact);
      
      // Salvar mensagem no banco
      await this.saveMessage({
        conversationId: conversation.id,
        whatsappMessageId: messageId,
        from: phoneNumber,
        type: messageType,
        content: messageText,
        timestamp: timestamp,
        direction: 'inbound'
      });

      // Emitir evento em tempo real
      if (socketService) {
        socketService.emitNewWhatsAppMessage(conversation.id, {
          id: messageId,
          content: messageText,
          sender: 'customer',
          messageType: messageType,
          timestamp: timestamp,
          customerPhone: phoneNumber
        });
      }

      // Processar diferentes tipos de mensagem
      switch (messageType) {
        case 'text':
          await this.handleTextMessage(conversation, messageText, phoneNumber, socketService);
          break;
        case 'image':
          await this.handleMediaMessage(conversation, message.image, 'image', phoneNumber, socketService);
          break;
        case 'audio':
          await this.handleMediaMessage(conversation, message.audio, 'audio', phoneNumber, socketService);
          break;
        case 'document':
          await this.handleMediaMessage(conversation, message.document, 'document', phoneNumber, socketService);
          break;
        default:
          console.log(`Tipo de mensagem não suportado: ${messageType}`);
      }

      // Marcar mensagem como lida
      await this.markMessageAsRead(messageId);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  }

  // Buscar ou criar conversa
  async getOrCreateConversation(phoneNumber, contact) {
    try {
      // Buscar conversa existente
      const [existingConversation] = await db.execute(
        'SELECT * FROM conversations WHERE phone_number = ? AND status != "closed"',
        [phoneNumber]
      );

      if (existingConversation.length > 0) {
        return existingConversation[0];
      }

      // Criar nova conversa
      const contactName = contact?.profile?.name || contact?.wa_id || phoneNumber;
      const [result] = await db.execute(
        `INSERT INTO conversations (phone_number, contact_name, status, created_at, updated_at) 
         VALUES (?, ?, 'active', NOW(), NOW())`,
        [phoneNumber, contactName]
      );

      return {
        id: result.insertId,
        phone_number: phoneNumber,
        contact_name: contactName,
        status: 'active'
      };
    } catch (error) {
      console.error('Erro ao buscar/criar conversa:', error);
      throw error;
    }
  }

  // Salvar mensagem no banco
  async saveMessage(messageData) {
    try {
      await db.execute(
        `INSERT INTO messages (conversation_id, whatsapp_message_id, from_number, type, content, timestamp, direction, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          messageData.conversationId,
          messageData.whatsappMessageId,
          messageData.from,
          messageData.type,
          messageData.content,
          messageData.timestamp,
          messageData.direction
        ]
      );
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  // Processar mensagem de texto
  async handleTextMessage(conversation, messageText, phoneNumber, socketService = null) {
    try {
      // Buscar agente disponível ou usar chatbot
      const agent = await this.findAvailableAgent(conversation.id);
      
      if (agent) {
        // Notificar agente sobre nova mensagem
        await this.notifyAgent(agent.id, conversation.id, messageText, socketService);
      } else {
        // Usar chatbot para resposta automática
        await this.handleChatbotResponse(conversation, messageText, phoneNumber, socketService);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem de texto:', error);
    }
  }

  // Processar mídia
  async handleMediaMessage(conversation, media, type, phoneNumber, socketService = null) {
    try {
      const mediaUrl = await this.downloadMedia(media.id);
      
      // Salvar informações da mídia
      await db.execute(
        `UPDATE messages SET media_url = ?, media_mime_type = ? 
         WHERE conversation_id = ? AND whatsapp_message_id = ?`,
        [mediaUrl, media.mime_type, conversation.id, media.id]
      );

      // Notificar agente sobre mídia recebida
      const agent = await this.findAvailableAgent(conversation.id);
      if (agent) {
        await this.notifyAgent(agent.id, conversation.id, `Mídia recebida: ${type}`, socketService);
      }
    } catch (error) {
      console.error('Erro ao processar mídia:', error);
    }
  }

  // Buscar agente disponível
  async findAvailableAgent(conversationId) {
    try {
      const [agents] = await db.execute(
        `SELECT * FROM agents 
         WHERE is_active = 1 AND status = 'online' 
         ORDER BY last_activity ASC 
         LIMIT 1`
      );

      return agents.length > 0 ? agents[0] : null;
    } catch (error) {
      console.error('Erro ao buscar agente:', error);
      return null;
    }
  }

  // Resposta automática do chatbot
  async handleChatbotResponse(conversation, messageText, phoneNumber, socketService = null) {
    try {
      // Implementar lógica de chatbot aqui
      const response = await this.generateChatbotResponse(messageText, conversation);
      
      if (response) {
        await this.sendMessage(phoneNumber, response, 'text', socketService, conversation.id);
      }
    } catch (error) {
      console.error('Erro na resposta do chatbot:', error);
    }
  }

  // Gerar resposta do chatbot
  async generateChatbotResponse(messageText, conversation) {
    // Respostas automáticas básicas
    const lowerMessage = messageText.toLowerCase();
    
    if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('ola')) {
      return 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?';
    }
    
    if (lowerMessage.includes('horário') || lowerMessage.includes('horario')) {
      return 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.';
    }
    
    if (lowerMessage.includes('ajuda') || lowerMessage.includes('suporte')) {
      return 'Estou aqui para ajudar! Um de nossos agentes entrará em contato em breve.';
    }
    
    // Resposta padrão
    return 'Obrigado pela sua mensagem! Um agente entrará em contato em breve.';
  }

  // Enviar mensagem
  async sendMessage(to, message, type = 'text', socketService = null, conversationId = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: type
      };

      if (type === 'text') {
        payload.text = { body: message };
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Salvar mensagem enviada no banco
      await this.saveOutboundMessage(to, message, response.data.messages[0].id);

      // Emitir evento em tempo real
      if (socketService && conversationId) {
        socketService.emitNewWhatsAppMessage(conversationId, {
          id: response.data.messages[0].id,
          content: message,
          sender: 'agent',
          messageType: type,
          timestamp: new Date(),
          customerPhone: to
        });
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  // Salvar mensagem enviada
  async saveOutboundMessage(to, message, whatsappMessageId) {
    try {
      const [conversation] = await db.execute(
        'SELECT id FROM conversations WHERE phone_number = ?',
        [to]
      );

      if (conversation.length > 0) {
        await db.execute(
          `INSERT INTO messages (conversation_id, whatsapp_message_id, to_number, type, content, direction, created_at) 
           VALUES (?, ?, ?, 'text', ?, 'outbound', NOW())`,
          [conversation[0].id, whatsappMessageId, to, message]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem enviada:', error);
    }
  }

  // Marcar mensagem como lida
  async markMessageAsRead(messageId) {
    try {
      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  }

  // Download de mídia
  async downloadMedia(mediaId) {
    try {
      // Primeiro, obter URL da mídia
      const mediaResponse = await axios.get(
        `${this.baseUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const mediaUrl = mediaResponse.data.url;
      
      // Fazer download da mídia
      const downloadResponse = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'stream'
      });

      // Aqui você pode salvar o arquivo localmente ou em um serviço de armazenamento
      // Por enquanto, retornamos a URL
      return mediaUrl;
    } catch (error) {
      console.error('Erro ao fazer download da mídia:', error);
      return null;
    }
  }

  // Processar status de mensagem
  async handleMessageStatus(status) {
    try {
      await db.execute(
        `UPDATE messages SET status = ?, updated_at = NOW() 
         WHERE whatsapp_message_id = ?`,
        [status.status, status.id]
      );
    } catch (error) {
      console.error('Erro ao atualizar status da mensagem:', error);
    }
  }

  // Notificar agente
  async notifyAgent(agentId, conversationId, message, socketService = null) {
    // Implementar notificação via WebSocket ou outro método
    console.log(`Notificando agente ${agentId} sobre nova mensagem na conversa ${conversationId}`);
    
    if (socketService) {
      socketService.emitToAgent(agentId, 'new-whatsapp-message', {
        conversationId,
        message,
        timestamp: new Date()
      });
    }
  }
}

module.exports = new WhatsAppService();