import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { apiService } from '../services/api';
import { Conversation } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Conversations: React.FC = () => {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'pending'>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar se há token para decidir entre dados mock ou reais
        const token = localStorage.getItem('token');
        
        if (!token || token.includes('demo')) {
          console.log('Carregando dados mockados de conversas');
          
          // Dados mockados para demonstração
          const mockConversations = [
            {
              id: '1',
              user_id: 1,
              agent_id: 1,
              channel: 'whatsapp',
              status: 'active',
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
              updated_at: new Date().toISOString(),
              user: {
                id: 1,
                name: 'João Silva',
                phone: '+5511999999999',
                email: 'joao@email.com'
              },
              agent: {
                id: 1,
                name: 'Assistente de Vendas'
              },
              messages: [
                {
                  id: '1',
                  content: 'Olá! Gostaria de saber mais sobre seus produtos.',
                  sender: 'user',
                  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: '2',
                  content: 'Olá! Claro, ficarei feliz em ajudar. Que tipo de produto você está procurando?',
                  sender: 'agent',
                  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString()
                },
                {
                  id: '3',
                  content: 'Estou interessado em soluções de automação.',
                  sender: 'user',
                  timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
                }
              ],
              rating: 5
            },
            {
              id: '2',
              user_id: 2,
              agent_id: 2,
              channel: 'whatsapp',
              status: 'resolved',
              created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
              updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
              user: {
                id: 2,
                name: 'Maria Santos',
                phone: '+5511888888888',
                email: 'maria@email.com'
              },
              agent: {
                id: 2,
                name: 'Suporte Técnico'
              },
              messages: [
                {
                  id: '4',
                  content: 'Preciso de ajuda com um problema técnico.',
                  sender: 'user',
                  timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: '5',
                  content: 'Claro! Pode me descrever o problema que está enfrentando?',
                  sender: 'agent',
                  timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000).toISOString()
                },
                {
                  id: '6',
                  content: 'Problema resolvido! Muito obrigada pela ajuda.',
                  sender: 'user',
                  timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
                }
              ],
              rating: 4
            },
            {
              id: '3',
              user_id: 3,
              agent_id: 1,
              channel: 'whatsapp',
              status: 'pending',
              created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min atrás
              updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              user: {
                id: 3,
                name: 'Carlos Oliveira',
                phone: '+5511777777777',
                email: 'carlos@email.com'
              },
              agent: {
                id: 1,
                name: 'Assistente de Vendas'
              },
              messages: [
                {
                  id: '7',
                  content: 'Oi, vocês têm desconto para empresas?',
                  sender: 'user',
                  timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                }
              ],
              rating: null
            }
          ];
          
          dispatch({ type: 'SET_CONVERSATIONS', payload: mockConversations });
        } else {
          // Tentar carregar dados reais
          const conversationsData = await apiService.getConversations();
          dispatch({ type: 'SET_CONVERSATIONS', payload: conversationsData.conversations || [] });
        }
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar conversas');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [dispatch]);

  const filteredConversations = state.conversations.filter(conversation => {
    const matchesSearch = conversation.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || conversation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return '📱';
      // Outros canais serão adicionados quando implementados
      default: return '💬';
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
          <p className="text-gray-600">Gerencie todas as interações com clientes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Buscar conversas..."
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="resolved">Resolvido</option>
          <option value="pending">Pendente</option>
        </select>
        <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <FunnelIcon className="w-4 h-4 mr-2" />
          Filtros
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando conversas...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Conversas</p>
              <p className="text-2xl font-bold text-gray-900">{state.conversations.length}</p>
            </div>
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversas Ativas</p>
              <p className="text-2xl font-bold text-green-600">
                {state.conversations.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tempo Médio</p>
              <p className="text-2xl font-bold text-yellow-600">2.3s</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Satisfação</p>
              <p className="text-2xl font-bold text-purple-600">4.6</p>
            </div>
            <div className="text-yellow-400 text-2xl">⭐</div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Conversas Recentes</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredConversations.map((conversation, index) => {
            const agent = state.agents.find(a => a.id === conversation.agentId);
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            
            return (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          Cliente #{conversation.userId.slice(-4)}
                        </p>
                        <span className="text-lg">{getChannelIcon(conversation.channel)}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {lastMessage.content}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500">
                Agente: {agent?.name || 'N/A'}
              </span>
              <span className="text-xs text-gray-500">
                {conversation.messages?.length || 0} mensagens
              </span>
              {conversation.satisfaction && (
                <span className="text-xs text-yellow-600">
                  ⭐ {conversation.satisfaction}/5
                </span>
              )}
            </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-xs text-gray-500">
                      {formatDate(lastMessage.timestamp)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(lastMessage.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredConversations.length === 0 && (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma conversa encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Tente ajustar os filtros de busca.' : 'As conversas aparecerão aqui quando os clientes interagirem com seus agentes.'}
          </p>
        </div>
      )}
    </div>
  );
};