const db = require('../config/database');
const whatsappService = require('./whatsappService');

class ChatbotService {
  constructor() {
    this.isEnabled = process.env.CHATBOT_ENABLED === 'true';
    this.defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai';
    this.autoResponseDelay = parseInt(process.env.CHATBOT_RESPONSE_DELAY) || 2000;
    this.maxContextMessages = 10;
  }

  // Verificar se deve responder automaticamente
  async shouldAutoRespond(conversationId, message) {
    try {
      if (!this.isEnabled) return false;

      // Verificar configurações da conversa
      const [settings] = await db.execute(
        'SELECT chatbot_enabled, agent_id FROM conversations WHERE id = ?',
        [conversationId]
      );

      if (settings.length === 0) return false;
      
      const conversation = settings[0];
      
      // Não responder se já tem agente atribuído
      if (conversation.agent_id) return false;
      
      // Verificar se chatbot está habilitado para esta conversa
      if (conversation.chatbot_enabled === false) return false;

      // Verificar horário de funcionamento
      if (!this.isBusinessHours()) {
        await this.sendOutOfHoursMessage(conversationId, message.from);
        return false;
      }

      // Verificar palavras-chave que requerem agente humano
      const humanKeywords = ['agente', 'humano', 'pessoa', 'falar com alguém', 'reclamação', 'problema urgente'];
      const messageText = message.text?.toLowerCase() || '';
      
      if (humanKeywords.some(keyword => messageText.includes(keyword))) {
        await this.requestHumanAgent(conversationId, message.from, 'Solicitação de agente humano');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar auto-resposta:', error);
      return false;
    }
  }

  // Gerar resposta automática
  async generateResponse(conversationId, message) {
    try {
      // Buscar contexto da conversa
      const context = await this.getConversationContext(conversationId);
      
      // Verificar se é uma pergunta frequente
      const faqResponse = await this.checkFAQ(message.text);
      if (faqResponse) {
        return faqResponse;
      }

      // Gerar resposta usando IA
      const aiResponse = await this.generateAIResponse(message.text, context);
      
      return aiResponse;
    } catch (error) {
      console.error('Erro ao gerar resposta:', error);
      return this.getDefaultResponse();
    }
  }

  // Buscar contexto da conversa
  async getConversationContext(conversationId) {
    try {
      const [messages] = await db.execute(
        `SELECT content, direction, created_at 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [conversationId, this.maxContextMessages]
      );

      return messages.reverse().map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar contexto:', error);
      return [];
    }
  }

  // Verificar perguntas frequentes
  async checkFAQ(messageText) {
    try {
      const [faqs] = await db.execute(
        'SELECT answer FROM faq WHERE LOWER(?) LIKE CONCAT("%", LOWER(keywords), "%") LIMIT 1',
        [messageText]
      );

      return faqs.length > 0 ? faqs[0].answer : null;
    } catch (error) {
      console.error('Erro ao verificar FAQ:', error);
      return null;
    }
  }

  // Gerar resposta usando IA
  async generateAIResponse(messageText, context) {
    try {
      const aiProviders = require('./aiProviders');
      
      const systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp. 
      Seja útil, educado e conciso. Responda em português brasileiro.
      Se não souber a resposta, sugira que o cliente aguarde um agente humano.
      Mantenha as respostas curtas (máximo 160 caracteres quando possível).`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...context,
        { role: 'user', content: messageText }
      ];

      let response;
      
      switch (this.defaultProvider) {
        case 'openai':
          response = await aiProviders.openai.generateResponse(messages);
          break;
        case 'gemini':
          response = await aiProviders.gemini.generateResponse(messages);
          break;
        case 'huggingface':
          response = await aiProviders.huggingface.generateResponse(messages);
          break;
        default:
          response = await aiProviders.openai.generateResponse(messages);
      }

      return response;
    } catch (error) {
      console.error('Erro na IA:', error);
      return this.getDefaultResponse();
    }
  }

  // Resposta padrão quando IA falha
  getDefaultResponse() {
    const responses = [
      'Obrigado pela sua mensagem! Um de nossos agentes entrará em contato em breve.',
      'Recebemos sua mensagem. Nossa equipe responderá o mais rápido possível.',
      'Sua mensagem é importante para nós. Aguarde que logo um agente irá atendê-lo.',
      'Mensagem recebida! Estamos analisando e retornaremos em breve.'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Verificar horário comercial
  isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = domingo, 6 = sábado
    
    // Segunda a sexta: 8h às 18h
    if (day >= 1 && day <= 5) {
      return hour >= 8 && hour < 18;
    }
    
    // Sábado: 8h às 12h
    if (day === 6) {
      return hour >= 8 && hour < 12;
    }
    
    // Domingo: fechado
    return false;
  }

  // Enviar mensagem fora do horário
  async sendOutOfHoursMessage(conversationId, phoneNumber) {
    try {
      const message = `Olá! Nosso atendimento funciona:\n\n` +
        `🕐 Segunda a Sexta: 8h às 18h\n` +
        `🕐 Sábado: 8h às 12h\n` +
        `🕐 Domingo: Fechado\n\n` +
        `Deixe sua mensagem que responderemos no próximo horário comercial!`;

      await whatsappService.sendMessage(phoneNumber, message, 'text');
      
      // Marcar conversa como fora do horário
      await db.execute(
        'UPDATE conversations SET status = "out_of_hours" WHERE id = ?',
        [conversationId]
      );
    } catch (error) {
      console.error('Erro ao enviar mensagem fora do horário:', error);
    }
  }

  // Solicitar agente humano
  async requestHumanAgent(conversationId, phoneNumber, reason) {
    try {
      const message = 'Entendi que você gostaria de falar com um agente. ' +
        'Estou transferindo você para nossa equipe de atendimento. ' +
        'Por favor, aguarde um momento.';

      await whatsappService.sendMessage(phoneNumber, message, 'text');
      
      // Atualizar status da conversa
      await db.execute(
        'UPDATE conversations SET status = "pending_agent", transfer_reason = ? WHERE id = ?',
        [reason, conversationId]
      );

      // Notificar agentes disponíveis
      await this.notifyAvailableAgents(conversationId, reason);
    } catch (error) {
      console.error('Erro ao solicitar agente:', error);
    }
  }

  // Notificar agentes disponíveis
  async notifyAvailableAgents(conversationId, reason) {
    try {
      const [agents] = await db.execute(
        'SELECT id, name, email FROM users WHERE role = "agent" AND status = "active"'
      );

      // Aqui você pode implementar notificação por email, push, etc.
      console.log(`Notificando ${agents.length} agentes sobre nova conversa:`, {
        conversationId,
        reason
      });
    } catch (error) {
      console.error('Erro ao notificar agentes:', error);
    }
  }

  // Processar mensagem com chatbot
  async processMessage(conversationId, message, socketService = null) {
    try {
      // Verificar se deve responder automaticamente
      if (!(await this.shouldAutoRespond(conversationId, message))) {
        return false;
      }

      // Aguardar um pouco para simular digitação
      await new Promise(resolve => setTimeout(resolve, this.autoResponseDelay));

      // Gerar resposta
      const response = await this.generateResponse(conversationId, message);
      
      // Enviar resposta
      await whatsappService.sendMessage(message.from, response, 'text');
      
      // Salvar resposta no banco
      await db.execute(
        `INSERT INTO messages (conversation_id, direction, type, content, is_bot_response, created_at) 
         VALUES (?, 'outbound', 'text', ?, true, NOW())`,
        [conversationId, response]
      );

      // Emitir evento via socket se disponível
      if (socketService) {
        socketService.emitNewMessage(conversationId, {
          id: Date.now(),
          conversation_id: conversationId,
          direction: 'outbound',
          type: 'text',
          content: response,
          is_bot_response: true,
          created_at: new Date().toISOString()
        });
      }

      console.log('Resposta automática enviada:', {
        conversationId,
        responseLength: response.length
      });

      return true;
    } catch (error) {
      console.error('Erro ao processar mensagem com chatbot:', error);
      return false;
    }
  }

  // Configurar FAQ padrão
  async setupDefaultFAQ() {
    try {
      const defaultFAQs = [
        {
          keywords: 'horário,funcionamento,atendimento,aberto',
          question: 'Qual o horário de funcionamento?',
          answer: 'Nosso atendimento funciona:\n\n🕐 Segunda a Sexta: 8h às 18h\n🕐 Sábado: 8h às 12h\n🕐 Domingo: Fechado'
        },
        {
          keywords: 'preço,valor,custo,quanto custa',
          question: 'Quanto custa?',
          answer: 'Para informações sobre preços, por favor aguarde que um agente entrará em contato para passar um orçamento personalizado.'
        },
        {
          keywords: 'localização,endereço,onde fica',
          question: 'Onde vocês ficam?',
          answer: 'Nossa empresa está localizada no centro da cidade. Para o endereço completo, um agente entrará em contato com você.'
        },
        {
          keywords: 'contato,telefone,email',
          question: 'Como entrar em contato?',
          answer: 'Você já está no canal certo! Continue a conversa aqui pelo WhatsApp que nossa equipe irá atendê-lo.'
        }
      ];

      for (const faq of defaultFAQs) {
        await db.execute(
          'INSERT IGNORE INTO faq (keywords, question, answer, created_at) VALUES (?, ?, ?, NOW())',
          [faq.keywords, faq.question, faq.answer]
        );
      }

      console.log('FAQ padrão configurado com sucesso');
    } catch (error) {
      console.error('Erro ao configurar FAQ:', error);
    }
  }
}

module.exports = new ChatbotService();