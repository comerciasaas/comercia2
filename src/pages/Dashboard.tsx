import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { MetricsChart } from '../components/Dashboard/MetricsChart';
import { apiService } from '../services/api';

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (isRedirecting) return;
      
      const token = localStorage.getItem('token');
      
      try {
        setLoading(true);
        setError(null);
        
        // Para teste: usar dados mockados se não houver token
        if (!token) {
          console.log('Usando dados mockados para teste do Dashboard');
          
          // Dados mockados para teste
          const mockStats = {
            overview: {
              totalUsers: 150,
              activeConversations: 23,
              totalConversations: 1247,
              avgResponseTime7d: 2.3,
              avgSatisfaction: 4.7,
              newUsers30d: 45
            },
            trends: {
              dailyConversations: [
                { date: '2024-01-01', count: 45 },
                { date: '2024-01-02', count: 52 },
                { date: '2024-01-03', count: 38 },
                { date: '2024-01-04', count: 67 },
                { date: '2024-01-05', count: 71 },
                { date: '2024-01-06', count: 58 },
                { date: '2024-01-07', count: 63 }
              ],
              growth: [
                { date: '2024-01-01', users: 105 },
                { date: '2024-01-02', users: 112 },
                { date: '2024-01-03', users: 118 },
                { date: '2024-01-04', users: 125 },
                { date: '2024-01-05', users: 132 },
                { date: '2024-01-06', users: 141 },
                { date: '2024-01-07', users: 150 }
              ],
              dailyAgents: [
                { date: '2024-01-01', count: 2 },
                { date: '2024-01-02', count: 1 },
                { date: '2024-01-03', count: 3 },
                { date: '2024-01-04', count: 2 },
                { date: '2024-01-05', count: 4 },
                { date: '2024-01-06', count: 1 },
                { date: '2024-01-07', count: 2 }
              ]
            }
          };
          
          dispatch({ type: 'SET_DASHBOARD_STATS', payload: mockStats });
          
          // Agentes mockados
          const mockAgents = [
            {
              id: 1,
              name: 'Assistente de Vendas',
              description: 'Agente especializado em vendas e atendimento',
              is_active: true,
              total_conversations: 156,
              avg_response_time: 2.1,
              avg_satisfaction: 4.8
            },
            {
              id: 2,
              name: 'Suporte Técnico',
              description: 'Agente para suporte técnico e resolução de problemas',
              is_active: true,
              total_conversations: 89,
              avg_response_time: 3.2,
              avg_satisfaction: 4.5
            },
            {
              id: 3,
              name: 'FAQ Bot',
              description: 'Agente para perguntas frequentes',
              is_active: false,
              total_conversations: 234,
              avg_response_time: 1.8,
              avg_satisfaction: 4.2
            }
          ];
          
          dispatch({ type: 'SET_AGENTS', payload: mockAgents });
          
        } else {
          // Carregar dados reais do usuário
          const userData = await apiService.getProfile();
          dispatch({ type: 'SET_USER', payload: userData });

          // Carregar estatísticas do usuário (não admin)
          const [agentStats, conversations] = await Promise.all([
            apiService.getAgentStats(),
            apiService.getConversations({ limit: 10 })
          ]);
          
          const userStats = {
            overview: {
              totalUsers: 1, // Usuário atual
              activeConversations: conversations?.active || 0,
              totalConversations: conversations?.total || 0,
              avgResponseTime7d: agentStats?.avgResponseTime || 0,
              avgSatisfaction: agentStats?.avgSatisfaction || 0,
              newUsers30d: 0
            },
            trends: {
              dailyConversations: agentStats?.dailyConversations || [],
              growth: [],
              dailyAgents: []
            }
          };
          
          dispatch({ type: 'SET_DASHBOARD_STATS', payload: userStats });

          // Carregar agentes do usuário
          const agents = await apiService.getAgents();
          dispatch({ type: 'SET_AGENTS', payload: agents.agents || [] });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [dispatch]);

  const stats = state.dashboardStats;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua plataforma de agentes de IA</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Novo Agente
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Usuários"
          value={stats.overview?.totalUsers || 0}
          change={`${stats.overview?.newUsers30d || 0} novos este mês`}
          changeType="positive"
          icon={UserGroupIcon}
          color="blue"
        />
        <StatsCard
          title="Conversas Ativas"
          value={stats.overview?.activeConversations || 0}
          change={`${stats.overview?.totalConversations || 0} total`}
          changeType="positive"
          icon={ChatBubbleLeftRightIcon}
          color="green"
        />
        <StatsCard
          title="Tempo Médio de Resposta"
          value={`${stats.overview?.avgResponseTime7d?.toFixed(1) || '0.0'}s`}
          change="Últimos 7 dias"
          changeType="neutral"
          icon={ClockIcon}
          color="yellow"
        />
        <StatsCard
          title="Satisfação Média"
          value={stats.overview?.avgSatisfaction?.toFixed(1) || '0.0'}
          change="Avaliação geral"
          changeType="neutral"
          icon={StarIcon}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          data={stats.trends?.dailyConversations || []}
          title="Conversas por Dia"
          dataKey="conversations"
          color="#3B82F6"
          type="area"
        />
        <MetricsChart
          data={stats.trends?.growth || []}
          title="Crescimento de Usuários"
          dataKey="new_users"
          color="#10B981"
          type="line"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MetricsChart
          data={stats.trends?.dailyAgents || []}
          title="Novos Agentes por Dia"
          dataKey="agents"
          color="#F59E0B"
          type="area"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Agents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agentes Mais Ativos</h3>
          <div className="space-y-4">
            {Array.isArray(state.agents) ? state.agents.slice(0, 3).map((agent, index) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${agent.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.metrics?.totalConversations || 0} conversas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{agent.metrics?.satisfactionRating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-gray-500">satisfação</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Nenhum agente encontrado</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Recentes</h3>
          <div className="space-y-4">
            {!Array.isArray(state.agents) || state.agents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum alerta no momento</p>
                <p className="text-sm text-gray-400 mt-1">Crie agentes para monitorar alertas</p>
              </div>
            ) : (
              <>
                {/* Alertas dinâmicos baseados nos agentes reais */}
                {Array.isArray(state.agents) ? state.agents
                  .filter(agent => agent.metrics?.avgResponseTime && agent.metrics.avgResponseTime > 3)
                  .slice(0, 1)
                  .map(agent => ( 
                    <div key={`alert-${agent.id}`} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Tempo de resposta elevado</p>
                        <p className="text-xs text-yellow-600">{agent.name} - {agent.metrics?.avgResponseTime?.toFixed(1)}s média</p>
                      </div>
                    </div>
                  )) : []
                }
                
                {stats.overview?.activeConversations && stats.overview.activeConversations > 0 && (
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Conversas ativas</p>
                      <p className="text-xs text-blue-600">{stats.overview.activeConversations} conversas em andamento</p>
                    </div>
                  </div>
                )}
                
                {Array.isArray(state.agents) ? state.agents
                  .filter(agent => agent.metrics?.satisfactionRating && agent.metrics.satisfactionRating >= 4.5)
                  .slice(0, 1)
                  .map(agent => (
                    <div key={`satisfaction-${agent.id}`} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <StarIcon className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Excelente satisfação</p>
                        <p className="text-xs text-green-600">{agent.name} - {agent.metrics?.satisfactionRating?.toFixed(1)}/5.0</p>
                      </div>
                    </div>
                  )) : []
                }
                
                {/* Fallback quando não há alertas específicos */}
                {Array.isArray(state.agents) && state.agents.every(agent => 
                  (!agent.metrics?.avgResponseTime || agent.metrics.avgResponseTime <= 3) &&
                  (!agent.metrics?.satisfactionRating || agent.metrics.satisfactionRating < 4.5)
                ) && !stats.overview?.activeConversations && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Tudo funcionando normalmente</p>
                    <p className="text-sm text-gray-400 mt-1">Nenhum alerta crítico detectado</p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};