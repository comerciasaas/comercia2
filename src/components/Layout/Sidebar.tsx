import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CogIcon,
  RocketLaunchIcon,
  BoltIcon,
  PhoneIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/AppContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Agentes de IA', href: '/agents', icon: UserGroupIcon },
  { name: 'Conversas', href: '/conversations', icon: ChatBubbleLeftRightIcon },
  { name: 'WhatsApp', href: '/whatsapp', icon: DevicePhoneMobileIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Integrações', href: '/integrations', icon: BoltIcon },
  { name: 'Treinamento', href: '/training', icon: DocumentTextIcon },
  { name: 'Canais', href: '/channels', icon: PhoneIcon },
  { name: 'Alertas', href: '/alerts', icon: ExclamationTriangleIcon },
  { name: 'Configurações', href: '/settings', icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { state } = useApp();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <RocketLaunchIcon className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">AI Agents</h1>
            <p className="text-xs text-gray-500">SaaS Platform 2025</p>
          </div>
        </div>
      </div>

      {/* Test Mode Indicator */}
      {localStorage.getItem('authToken') === 'demo-token' && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="ml-2 text-xs font-medium text-blue-800">Modo Demonstração</p>
          </div>
        </div>
      )}

      {/* User Info */}
      {state.user && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <img
              className="w-10 h-10 rounded-full"
              src={state.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.name)}&background=6366f1&color=fff`}
              alt={state.user.name}
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{state.user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{state.user.plan} plan</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'
                }`}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estatísticas Rápidas</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Agentes Ativos</span>
              <span className="font-medium text-green-600">
                {localStorage.getItem('authToken') === 'demo-token' ? '8' : (Array.isArray(state.agents) ? state.agents.filter(a => a.isActive).length : 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Conversas Hoje</span>
              <span className="font-medium text-blue-600">
                {localStorage.getItem('authToken') === 'demo-token' ? '47' : (state.dashboardStats?.activeConversations || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>WhatsApp Ativo</span>
              <span className="font-medium text-purple-600">
                {localStorage.getItem('authToken') === 'demo-token' ? '12' : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Satisfação</span>
              <span className="font-medium text-yellow-600">
                {localStorage.getItem('authToken') === 'demo-token' ? '4.8★' : 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Usage Progress */}
          {localStorage.getItem('authToken') === 'demo-token' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Uso do Plano</span>
                <span className="font-medium">73%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full" style={{width: '73%'}}></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">2.190 / 3.000 mensagens</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};