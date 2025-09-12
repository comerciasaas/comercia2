// Tipos principais da aplicação
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  company?: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  createdAt: Date;
  avatar?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  objective: string;
  personality: 'formal' | 'casual' | 'friendly' | 'professional';
  aiProvider: 'chatgpt' | 'gemini' | 'huggingface';
  model: string;
  isActive: boolean;
  channels: Channel[];
  userId: string;
  trainingData: TrainingData[];
  metrics: AgentMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  type: 'whatsapp'; // | 'telegram' | 'messenger' | 'email' | 'sms' | 'website' - Serão adicionados quando implementados
  name: string;
  isConnected: boolean;
  config: Record<string, any>;
  agentId: string;
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'file';
  sender: 'user' | 'agent';
  timestamp: Date;
  conversationId: string;
  agentId: string;
  channel: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  channel: string;
  status: 'active' | 'resolved' | 'pending';
  startTime: Date;
  endTime?: Date;
  messages: Message[];
  satisfaction?: number;
  tags: string[];
}

export interface TrainingData {
  id: string;
  type: 'pdf' | 'csv' | 'faq' | 'text';
  filename: string;
  content: string;
  size: number;
  uploadedAt: Date;
  agentId: string;
  isProcessed: boolean;
}

export interface AgentMetrics {
  totalConversations: number;
  avgResponseTime: number; // em segundos
  satisfactionRating: number; // 1-5
  resolutionRate: number; // percentual
  activeConversations: number;
  dailyMessages: number;
  weeklyTrend: number; // percentual de crescimento
  slaCompliance: number; // percentual
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'chatgpt' | 'gemini' | 'huggingface';
  models: string[];
  isConfigured: boolean;
  apiKey?: string;
  config?: Record<string, any>;
}

export interface DashboardStats {
  totalAgents: number;
  totalConversations: number;
  avgSatisfaction: number;
  totalUsers: number;
  activeConversations: number;
  responseTime: number;
  trendsData: TrendData[];
}

export interface TrendData {
  date: string;
  conversations: number;
  satisfaction: number;
  responseTime: number;
}

export interface Feedback {
  id: string;
  agentId: string;
  conversationId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  userId: string;
}