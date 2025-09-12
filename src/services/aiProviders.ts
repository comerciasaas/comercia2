import { AIProvider, Message } from '../types';

export class AIService {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    // Inicializar providers padrão
    this.initializeProviders();
  }

  private initializeProviders() {
    const defaultProviders: AIProvider[] = [
      {
        id: 'chatgpt',
        name: 'ChatGPT (OpenAI)',
        type: 'chatgpt',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        isConfigured: false,
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        type: 'gemini',
        models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
        isConfigured: false,
      },
      {
        id: 'huggingface',
        name: 'Hugging Face',
        type: 'huggingface',
        models: ['microsoft/DialoGPT-large', 'facebook/blenderbot-400M-distill', 'microsoft/DialoGPT-medium'],
        isConfigured: false,
      },
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  getProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  configureProvider(providerId: string, config: { apiKey: string; model?: string }) {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.isConfigured = true;
      provider.apiKey = config.apiKey;
      provider.config = { ...provider.config, ...config };
      this.providers.set(providerId, provider);
    }
  }

  async sendMessage(
    providerId: string,
    message: string,
    context?: string,
    personality?: string
  ): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.isConfigured) {
      throw new Error(`Provider ${providerId} not configured`);
    }

    // Simulação de chamada para APIs reais
    switch (provider.type) {
      case 'chatgpt':
        return this.callChatGPT(message, context, personality, provider);
      case 'gemini':
        return this.callGemini(message, context, personality, provider);
      case 'huggingface':
        return this.callHuggingFace(message, context, personality, provider);
      default:
        throw new Error(`Unsupported provider: ${provider.type}`);
    }
  }

  private async callChatGPT(
    message: string,
    context?: string,
    personality?: string,
    provider?: AIProvider
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context, personality);
      
      if (!provider?.apiKey) {
        throw new Error('API Key do OpenAI não configurada');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: provider.config?.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('ChatGPT API Error:', error);
      return 'Desculpe, houve um erro ao processar sua solicitação com o ChatGPT. Tente novamente.';
    }
  }

  private async callGemini(
    message: string,
    context?: string,
    personality?: string,
    provider?: AIProvider
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context, personality);
      
      if (!provider?.apiKey) {
        throw new Error('API Key do Google Gemini não configurada');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${provider.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser: ${message}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'Desculpe, houve um erro ao processar sua solicitação com o Gemini. Tente novamente.';
    }
  }

  private async callHuggingFace(
    message: string,
    context?: string,
    personality?: string,
    provider?: AIProvider
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context, personality);
      const fullPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
      
      if (!provider?.apiKey) {
        throw new Error('API Key do Hugging Face não configurada');
      }

      const response = await fetch(`https://api-inference.huggingface.co/models/${provider.config?.model || 'microsoft/DialoGPT-large'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_length: 500,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HuggingFace API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data[0]?.generated_text || data.generated_text || '';
      
      // Limpar a resposta removendo o prompt original
      return generatedText.replace(fullPrompt, '').trim();
    } catch (error) {
      console.error('HuggingFace API Error:', error);
      return 'Desculpe, houve um erro ao processar sua solicitação com o Hugging Face. Tente novamente.';
    }
  }

  private buildSystemPrompt(context?: string, personality?: string): string {
    let prompt = 'Você é um agente de atendimento ao cliente especializado e eficiente.';
    
    if (personality) {
      const personalityPrompts = {
        formal: 'Mantenha um tom formal e profissional em todas as interações.',
        casual: 'Use um tom casual e amigável, como se estivesse conversando com um amigo.',
        friendly: 'Seja caloroso, empático e sempre positivo em suas respostas.',
        professional: 'Demonstre expertise e conhecimento técnico, mantendo-se profissional.',
      };
      prompt += ` ${personalityPrompts[personality as keyof typeof personalityPrompts]}`;
    }
    
    if (context) {
      prompt += ` Contexto adicional: ${context}`;
    }
    
    prompt += ' Sempre tente resolver o problema do cliente de forma completa e satisfatória.';
    
    return prompt;
  }

  // Funções de simulação removidas - usando APIs reais
}

// Tutorial de implementação das APIs reais
export const getImplementationTutorial = () => {
  return {
    chatgpt: {
      title: "Como implementar ChatGPT (OpenAI)",
      steps: [
        "1. Crie uma conta em https://platform.openai.com/",
        "2. Gere uma API Key em https://platform.openai.com/api-keys",
        "3. Instale: npm install openai",
        "4. Configure no código: const openai = new OpenAI({ apiKey: 'sua-key' })",
        "5. Chame: await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages: [...] })",
      ],
      documentation: "https://platform.openai.com/docs/api-reference",
    },
    gemini: {
      title: "Como implementar Google Gemini",
      steps: [
        "1. Acesse https://makersuite.google.com/app/apikey",
        "2. Crie um projeto no Google Cloud Console",
        "3. Ative a API Generative Language",
        "4. Gere uma API Key",
        "5. Use: fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=API_KEY')",
      ],
      documentation: "https://ai.google.dev/docs",
    },
    huggingface: {
      title: "Como implementar Hugging Face",
      steps: [
        "1. Crie conta em https://huggingface.co/",
        "2. Vá para https://huggingface.co/settings/tokens",
        "3. Gere um Access Token",
        "4. Instale: npm install @huggingface/inference",
        "5. Use: await hf.textGeneration({ model: 'gpt2', inputs: 'Hello' })",
      ],
      documentation: "https://huggingface.co/docs/api-inference/index",
    },
  };
};

export const aiService = new AIService();