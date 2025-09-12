const axios = require('axios');
const db = require('../config/database');

class TemplateService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.baseUrl = `${process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com'}/${this.apiVersion}`;
  }

  // Criar template de mensagem
  async createTemplate(templateData) {
    try {
      const { name, category, language, components } = templateData;

      const response = await axios.post(
        `${this.baseUrl}/${this.businessAccountId}/message_templates`,
        {
          name,
          category,
          language,
          components
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Salvar template no banco de dados
      await db.execute(
        `INSERT INTO message_templates (name, category, language, components, status, created_at) 
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [name, category, language, JSON.stringify(components)]
      );

      console.log('Template criado:', { name, category, language });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar template:', error.response?.data || error.message);
      throw error;
    }
  }

  // Listar templates
  async getTemplates(limit = 50) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.businessAccountId}/message_templates`,
        {
          params: { limit },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar templates:', error.response?.data || error.message);
      throw error;
    }
  }

  // Enviar mensagem usando template
  async sendTemplateMessage(to, templateName, languageCode, parameters = []) {
    try {
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      const messageData = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      };

      // Adicionar parâmetros se fornecidos
      if (parameters.length > 0) {
        messageData.template.components = [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }
        ];
      }

      const response = await axios.post(
        `${this.baseUrl}/${phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Salvar mensagem no banco
      await this.saveTemplateMessage(to, templateName, parameters, response.data);

      return response.data;
    } catch (error) {
      console.error('Erro ao enviar template:', error.response?.data || error.message);
      throw error;
    }
  }

  // Salvar mensagem de template no banco
  async saveTemplateMessage(to, templateName, parameters, responseData) {
    try {
      // Buscar ou criar conversa
      let [conversations] = await db.execute(
        'SELECT id FROM conversations WHERE phone_number = ? AND status = "active"',
        [to]
      );

      let conversationId;
      if (conversations.length === 0) {
        const [result] = await db.execute(
          'INSERT INTO conversations (phone_number, status, created_at) VALUES (?, "active", NOW())',
          [to]
        );
        conversationId = result.insertId;
      } else {
        conversationId = conversations[0].id;
      }

      // Salvar mensagem
      await db.execute(
        `INSERT INTO messages (conversation_id, message_id, direction, type, content, template_name, template_params, created_at) 
         VALUES (?, ?, 'outbound', 'template', ?, ?, ?, NOW())`,
        [
          conversationId,
          responseData.messages?.[0]?.id || null,
          `Template: ${templateName}`,
          templateName,
          JSON.stringify(parameters)
        ]
      );

      console.log('Mensagem de template salva:', { to, templateName, conversationId });
    } catch (error) {
      console.error('Erro ao salvar mensagem de template:', error);
    }
  }

  // Templates pré-definidos comuns
  getCommonTemplates() {
    return {
      welcome: {
        name: 'welcome_message',
        category: 'MARKETING',
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Olá {{1}}! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?'
          }
        ]
      },
      appointment_reminder: {
        name: 'appointment_reminder',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Olá {{1}}! Lembramos que você tem um agendamento em {{2}} às {{3}}. Confirme sua presença respondendo SIM.'
          }
        ]
      },
      order_confirmation: {
        name: 'order_confirmation',
        category: 'TRANSACTIONAL',
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Pedido confirmado! Seu pedido #{{1}} no valor de R$ {{2}} foi recebido e será processado em breve.'
          }
        ]
      },
      support_ticket: {
        name: 'support_ticket',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            type: 'BODY',
            text: 'Ticket de suporte #{{1}} criado. Nossa equipe entrará em contato em até {{2}} horas úteis.'
          }
        ]
      }
    };
  }

  // Criar templates comuns automaticamente
  async setupCommonTemplates() {
    try {
      const templates = this.getCommonTemplates();
      const results = [];

      for (const [key, template] of Object.entries(templates)) {
        try {
          const result = await this.createTemplate(template);
          results.push({ template: key, success: true, data: result });
          
          // Aguardar um pouco entre criações para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          results.push({ template: key, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Erro ao configurar templates:', error);
      throw error;
    }
  }

  // Validar template antes de enviar
  validateTemplate(templateData) {
    const { name, category, language, components } = templateData;
    const errors = [];

    if (!name || name.length < 1 || name.length > 512) {
      errors.push('Nome do template deve ter entre 1 e 512 caracteres');
    }

    if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
      errors.push('Categoria deve ser MARKETING, UTILITY ou AUTHENTICATION');
    }

    if (!language || !language.match(/^[a-z]{2}_[A-Z]{2}$/)) {
      errors.push('Idioma deve estar no formato pt_BR, en_US, etc.');
    }

    if (!components || !Array.isArray(components) || components.length === 0) {
      errors.push('Template deve ter pelo menos um componente');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new TemplateService();