import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Phone, Clock, Users, TrendingUp, AlertCircle, Settings, Signal } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useSocket } from '../hooks/useSocket';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  contactName: string;
  agentId?: string;
  agentName?: string;
  status: 'active' | 'closed';
  lastActivity: string;
  stats: {
    total_messages: number;
    inbound_messages: number;
    outbound_messages: number;
    avg_response_time: number;
  };
}

interface WhatsAppMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'image' | 'document' | 'audio';
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
}

interface WhatsAppStats {
  overview: {
    active_sessions: number;
    sessions_24h: number;
    active_conversations: number;
    messages_1h: number;
    avg_response_time: number;
    satisfied_customers: number;
  };
  agents: Array<{
    id: string;
    name: string;
    active_sessions: number;
    completed_24h: number;
    avg_response_time: number;
    avg_satisfaction: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    message_count: number;
    inbound_count: number;
    outbound_count: number;
  }>;
}

const WhatsApp: React.FC = () => {
  const { state } = useApp();
  const { showSuccess, showError, showInfo } = useNotification();
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingIndicators, setTypingIndicators] = useState<Map<string, boolean>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isConnected, on, off, joinWhatsAppSession, leaveWhatsAppSession, sendTypingIndicator } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time event handlers
  const handleNewMessage = useCallback((data: any) => {
    if (selectedSession && data.sessionId === selectedSession.id) {
      setMessages(prev => [...prev, data]);
    }
    
    // Update session in the list
    setSessions(prev => prev.map(session => 
      session.id === data.sessionId 
        ? { ...session, lastActivity: data.createdAt }
        : session
    ));
  }, [selectedSession]);

  const handleNewSession = useCallback((data: any) => {
    setSessions(prev => [data, ...prev]);
    fetchStats(); // Refresh stats
  }, []);

  const handleSessionStatusChange = useCallback((data: any) => {
    setSessions(prev => prev.map(session => 
      session.id === data.sessionId 
        ? { ...session, status: data.status }
        : session
    ));
  }, []);

  const handleAgentAssigned = useCallback((data: any) => {
    setSessions(prev => prev.map(session => 
      session.id === data.sessionId 
        ? { ...session, agentId: data.agentId, agentName: data.agentName }
        : session
    ));
  }, []);

  const handleTypingIndicator = useCallback((data: any) => {
    setTypingIndicators(prev => {
      const newMap = new Map(prev);
      if (data.isTyping) {
        newMap.set(data.sessionId, true);
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingIndicators(current => {
            const updated = new Map(current);
            updated.delete(data.sessionId);
            return updated;
          });
        }, 3000);
      } else {
        newMap.delete(data.sessionId);
      }
      return newMap;
    });
  }, []);

  useEffect(() => {
    fetchStats();
    fetchActiveSessions();
    
    // Set up real-time event listeners
    on('whatsapp-message-received', handleNewMessage);
    on('new-whatsapp-session', handleNewSession);
    on('session-status-changed', handleSessionStatusChange);
    on('agent-assigned', handleAgentAssigned);
    on('agent-typing', handleTypingIndicator);
    
    // Atualizar dados a cada 60 segundos
    const interval = setInterval(() => {
      fetchStats();
      fetchActiveSessions();
      if (selectedSession) {
        fetchConversationHistory(selectedSession.phoneNumber);
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      off('whatsapp-message-received', handleNewMessage);
      off('new-whatsapp-session', handleNewSession);
      off('session-status-changed', handleSessionStatusChange);
      off('agent-assigned', handleAgentAssigned);
      off('agent-typing', handleTypingIndicator);
    };
  }, [handleNewMessage, handleNewSession, handleSessionStatusChange, handleAgentAssigned, handleTypingIndicator, on, off]);

  useEffect(() => {
    if (selectedSession) {
      // Leave previous session
      if (selectedSession) {
        leaveWhatsAppSession(selectedSession.id);
      }
      
      // Join new session for real-time updates
      joinWhatsAppSession(selectedSession.id);
      
      fetchConversationHistory(selectedSession.phoneNumber);
    }
  }, [selectedSession, joinWhatsAppSession, leaveWhatsAppSession]);

  const fetchStats = async () => {
    try {
      // Check for test credentials
      const authToken = localStorage.getItem('authToken');
      if (authToken === 'demo-token') {
        // Mock WhatsApp stats
        const mockStats = {
          overview: {
            active_sessions: 12,
            sessions_24h: 45,
            active_conversations: 8,
            messages_1h: 127,
            avg_response_time: 2.3,
            satisfied_customers: 89
          },
          agents: [
            {
              id: '1',
              name: 'Ana Silva',
              active_sessions: 4,
              completed_24h: 12,
              avg_response_time: 1.8,
              avg_satisfaction: 4.7
            },
            {
              id: '2',
              name: 'Carlos Santos',
              active_sessions: 3,
              completed_24h: 8,
              avg_response_time: 2.1,
              avg_satisfaction: 4.5
            },
            {
              id: '3',
              name: 'Maria Costa',
              active_sessions: 5,
              completed_24h: 15,
              avg_response_time: 1.9,
              avg_satisfaction: 4.8
            }
          ],
          hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            message_count: Math.floor(Math.random() * 50) + 10,
            inbound_count: Math.floor(Math.random() * 30) + 5,
            outbound_count: Math.floor(Math.random() * 25) + 3
          }))
        };
        setStats(mockStats);
        return;
      }
      
      const data = await apiService.getWhatsAppStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      // Check for test credentials
      const authToken = localStorage.getItem('authToken');
      if (authToken === 'demo-token') {
        // Mock WhatsApp sessions
        const mockSessions = [
          {
            id: 'session-1',
            phoneNumber: '+55 11 99999-9999',
            contactName: 'João Silva',
            agentId: '1',
            agentName: 'Ana Silva',
            status: 'active' as const,
            lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            stats: {
              total_messages: 15,
              inbound_messages: 8,
              outbound_messages: 7,
              avg_response_time: 1.2
            }
          },
          {
            id: 'session-2',
            phoneNumber: '+55 11 88888-8888',
            contactName: 'Maria Santos',
            agentId: '2',
            agentName: 'Carlos Santos',
            status: 'active' as const,
            lastActivity: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
            stats: {
              total_messages: 23,
              inbound_messages: 12,
              outbound_messages: 11,
              avg_response_time: 2.1
            }
          },
          {
            id: 'session-3',
            phoneNumber: '+55 11 77777-7777',
            contactName: 'Pedro Costa',
            status: 'active' as const,
            lastActivity: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            stats: {
              total_messages: 7,
              inbound_messages: 4,
              outbound_messages: 3,
              avg_response_time: 0.8
            }
          },
          {
            id: 'session-4',
            phoneNumber: '+55 11 66666-6666',
            contactName: 'Ana Oliveira',
            agentId: '3',
            agentName: 'Maria Costa',
            status: 'closed' as const,
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            stats: {
              total_messages: 31,
              inbound_messages: 16,
              outbound_messages: 15,
              avg_response_time: 1.9
            }
          }
        ];
        setSessions(mockSessions);
        setLoading(false);
        return;
      }
      
      const sessions = await apiService.getWhatsAppSessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Erro ao buscar sessões ativas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationHistory = async (phoneNumber: string) => {
    try {
      // Check for test credentials
      const authToken = localStorage.getItem('authToken');
      if (authToken === 'demo-token') {
        // Mock conversation history based on phone number
        const mockMessages: WhatsAppMessage[] = [
          {
            id: 'msg-1',
            content: 'Olá! Preciso de ajuda com meu pedido.',
            direction: 'inbound',
            messageType: 'text',
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: 'read'
          },
          {
            id: 'msg-2',
            content: 'Olá! Claro, posso te ajudar. Qual é o número do seu pedido?',
            direction: 'outbound',
            messageType: 'text',
            createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
            status: 'read'
          },
          {
            id: 'msg-3',
            content: 'É o pedido #12345. Ainda não recebi o produto.',
            direction: 'inbound',
            messageType: 'text',
            createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            status: 'read'
          },
          {
            id: 'msg-4',
            content: 'Deixe-me verificar o status do seu pedido. Um momento, por favor.',
            direction: 'outbound',
            messageType: 'text',
            createdAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
            status: 'read'
          },
          {
            id: 'msg-5',
            content: 'Verifiquei aqui e seu pedido foi enviado ontem. O código de rastreamento é BR123456789. Você pode acompanhar pelo site dos Correios.',
            direction: 'outbound',
            messageType: 'text',
            createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            status: 'read'
          },
          {
            id: 'msg-6',
            content: 'Perfeito! Muito obrigado pela ajuda. 😊',
            direction: 'inbound',
            messageType: 'text',
            createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
            status: 'read'
          }
        ];
        setMessages(mockMessages);
        return;
      }
      
      const messages = await apiService.getWhatsAppHistory(phoneNumber);
      setMessages(messages.reverse()); // Reverter para mostrar mensagens mais antigas primeiro
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || sendingMessage) return;

    setSendingMessage(true);
    try {
      // Check for test credentials
      const authToken = localStorage.getItem('authToken');
      if (authToken === 'demo-token') {
        // Mock message sending with delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Add message locally for immediate feedback
        const newMsg: WhatsAppMessage = {
          id: Date.now().toString(),
          content: newMessage,
          direction: 'outbound',
          messageType: 'text',
          createdAt: new Date().toISOString(),
          status: 'sent'
        };
        setMessages(prev => [...prev, newMsg]);
        
        // Simulate automatic response after 2 seconds
        setTimeout(() => {
          const autoReply: WhatsAppMessage = {
            id: (Date.now() + 1).toString(),
            content: 'Obrigado pela mensagem! Esta é uma resposta automática de teste.',
            direction: 'inbound',
            messageType: 'text',
            createdAt: new Date().toISOString(),
            status: 'sent'
          };
          setMessages(prev => [...prev, autoReply]);
        }, 2000);
        
        setNewMessage('');
        setSendingMessage(false);
        return;
      }
      
      await apiService.sendWhatsAppMessage({
        phoneNumber: selectedSession.phoneNumber,
        message: newMessage,
        messageType: 'text'
      });
      
      // Adicionar mensagem localmente para feedback imediato
      const newMsg: WhatsAppMessage = {
        id: Date.now().toString(),
        content: newMessage,
        direction: 'outbound',
        messageType: 'text',
        createdAt: new Date().toISOString(),
        status: 'sent'
      };
      setMessages(prev => [...prev, newMsg]);
      
      setNewMessage('');
      
      // Stop typing indicator
      sendTypingIndicator(selectedSession.id, false);
      
      // Atualizar histórico após um breve delay
      setTimeout(() => {
        fetchConversationHistory(selectedSession.phoneNumber);
      }, 1000);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showError('Erro ao enviar', 'Não foi possível enviar a mensagem');
    } finally {
      setSendingMessage(false);
    }
  };
  
  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (selectedSession) {
      // Send typing indicator
      sendTypingIndicator(selectedSession.id, value.length > 0);
    }
  };

  const assignAgent = async (sessionId: string, agentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/whatsapp/sessions/${sessionId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId })
      });
      
      if (response.ok) {
        fetchActiveSessions();
        showSuccess('Agente atribuído!', 'Conversa atribuída com sucesso');
      } else {
        showError('Erro ao atribuir', 'Não foi possível atribuir o agente');
      }
    } catch (error) {
      console.error('Erro ao atribuir agente:', error);
      showError('Erro de conexão', 'Não foi possível atribuir o agente');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
          <p className="text-gray-600">Gerencie conversas e atendimentos em tempo real</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Signal className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Settings className="h-4 w-4" />
            Configurações
          </button>
        </div>
      </div>

      {/* Test Credentials Info */}
      {localStorage.getItem('authToken') === 'demo-token' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">Modo de Demonstração - WhatsApp</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• <strong>Sessões ativas:</strong> 4 sessões de teste com diferentes status</p>
                <p>• <strong>Histórico:</strong> Conversas simuladas com clientes fictícios</p>
                <p>• <strong>Envio de mensagens:</strong> Simula envio com resposta automática</p>
                <p>• <strong>Estatísticas:</strong> Dados de exemplo para agentes e distribuição horária</p>
                <p>• <strong>Tempo real:</strong> Funcionalidades Socket.IO simuladas</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sessões Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.active_sessions}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mensagens (1h)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.messages_1h}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Resposta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatResponseTime(stats.overview.avg_response_time)}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Satisfação</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.satisfied_customers}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interface de Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Sessões */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Conversas Ativas</h3>
            <p className="text-sm text-gray-600">{sessions.length} sessões</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedSession?.id === session.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.contactName || session.phoneNumber}
                      </p>
                      <p className="text-sm text-gray-600">{session.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatTime(session.lastActivity)}
                    </p>
                    {session.stats.total_messages > 0 && (
                      <p className="text-xs text-blue-600">
                        {session.stats.total_messages} msgs
                      </p>
                    )}
                  </div>
                </div>
                {session.agentName && (
                  <p className="text-xs text-gray-500 mt-1">Agente: {session.agentName}</p>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma conversa ativa</p>
              </div>
            )}
          </div>
        </div>

        {/* Área de Chat */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border flex flex-col">
          {selectedSession ? (
            <>
              {/* Header do Chat */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedSession.contactName || selectedSession.phoneNumber}
                    </p>
                    <p className="text-sm text-gray-600">{selectedSession.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {selectedSession.status === 'active' ? 'Ativo' : 'Encerrado'}
                  </span>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 p-4 overflow-y-auto max-h-96">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${
                      message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direction === 'outbound'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.direction === 'outbound'
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Mensagem */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendingMessage ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Selecione uma conversa</p>
                <p className="text-sm">Escolha uma conversa da lista para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;