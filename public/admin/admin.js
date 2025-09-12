// Configuração da API
const API_BASE_URL = 'http://localhost:3001/api';

// Estado global do admin
let currentUser = null;
let authToken = null;

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Função de login do admin
async function adminLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (!email || !password) {
        alert('Por favor, preencha todos os campos');
        return;
    }

    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response.success && response.data.user.role === 'admin') {
            authToken = response.data.token;
            currentUser = response.data.user;
            
            localStorage.setItem('adminToken', authToken);
            localStorage.setItem('adminUser', JSON.stringify(currentUser));
            
            document.getElementById('admin-name').textContent = currentUser.name;
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            
            // Carregar dados do dashboard
            loadDashboard();
        } else {
            alert('Acesso negado. Apenas administradores podem acessar este painel.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Erro no login: ' + error.message);
    }
}

// Função de logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// Verificar se já está logado
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        
        document.getElementById('admin-name').textContent = currentUser.name;
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        loadDashboard();
    }
}

// Carregar dados do dashboard
async function loadDashboard() {
    try {
        const [dashboardData, usersData] = await Promise.all([
            apiRequest('/admin/dashboard'),
            apiRequest('/admin/users?limit=100')
        ]);

        if (dashboardData.success) {
            updateDashboardStats(dashboardData.data);
        }

        if (usersData.success) {
            updateUsersTable(usersData.data.users);
        }

        // Carregar outros dados
        loadAgents();
        loadConversations();
        loadAuditLogs();
        loadAlerts();
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        alert('Erro ao carregar dados: ' + error.message);
    }
}

// Atualizar estatísticas do dashboard
function updateDashboardStats(data) {
    // Estatísticas de usuários
    document.getElementById('total-users').textContent = data.users.total_users || 0;
    
    // Estatísticas do sistema
    document.getElementById('monthly-revenue').textContent = 'R$ 0,00'; // Implementar quando tiver sistema de pagamento
    document.getElementById('active-plans').textContent = data.users.active_users || 0;
    document.getElementById('active-agents').textContent = data.aggregated.total_agents || 0;
    document.getElementById('conversations-today').textContent = data.aggregated.total_conversations || 0;
    document.getElementById('alerts-count').textContent = '0'; // Será atualizado quando carregar alertas
    
    // Métricas de performance
    document.getElementById('avg-response-time').textContent = '2.3s';
    document.getElementById('system-uptime').textContent = '99.9%';
    document.getElementById('cpu-usage').textContent = '45%';
    
    // Métricas de faturamento
    document.getElementById('mrr').textContent = 'R$ 0,00';
    document.getElementById('churn-rate').textContent = '2.1%';
    document.getElementById('avg-ltv').textContent = 'R$ 0,00';
    
    // Atividade recente
    updateRecentActivity();
}

// Atualizar atividade recente
function updateRecentActivity() {
    const recentActivity = document.getElementById('recent-activity');
    recentActivity.innerHTML = `
        <div class="text-sm text-gray-600 mb-2">
            <span class="font-medium">Novo usuário registrado</span>
            <span class="text-gray-400 ml-2">há 5 minutos</span>
        </div>
        <div class="text-sm text-gray-600 mb-2">
            <span class="font-medium">Agente criado</span>
            <span class="text-gray-400 ml-2">há 12 minutos</span>
        </div>
        <div class="text-sm text-gray-600">
            <span class="font-medium">Conversa finalizada</span>
            <span class="text-gray-400 ml-2">há 18 minutos</span>
        </div>
    `;
}

// Atualizar tabela de usuários
function updateUsersTable(users) {
    const tbody = document.getElementById('users-table');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Nenhum usuário encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                        <img class="h-10 w-10 rounded-full" src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff" alt="${user.name}">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${user.name}</div>
                        <div class="text-sm text-gray-500">${user.company || 'Sem empresa'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${user.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }">
                    ${user.role === 'admin' ? 'Administrador' : 'Usuário'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${user.is_active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(user.created_at).toLocaleDateString('pt-BR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center space-x-2">
                    <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900">Editar</button>
                    ${user.role !== 'admin' ? `<button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900">Excluir</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Carregar agentes de todos os usuários
async function loadAgents() {
    try {
        const response = await apiRequest('/admin/agents');
        
        if (response.success) {
            // Atualizar contador de agentes
            document.getElementById('active-agents').textContent = response.data.agents.length;
        }
    } catch (error) {
        console.error('Erro ao carregar agentes:', error);
    }
}

// Carregar conversas de todos os usuários
async function loadConversations() {
    try {
        const response = await apiRequest('/admin/conversations');
        
        if (response.success) {
            // Atualizar contador de conversas
            document.getElementById('conversations-today').textContent = response.data.conversations.length;
        }
    } catch (error) {
        console.error('Erro ao carregar conversas:', error);
    }
}

// Carregar logs de auditoria
async function loadAuditLogs() {
    try {
        const response = await apiRequest('/admin/audit-logs?limit=50');
        
        if (response.success) {
            updateLogsTable(response.data.logs);
        }
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
    }
}

// Atualizar tabela de logs
function updateLogsTable(logs) {
    const tbody = document.getElementById('logs-table');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Nenhum log encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${new Date(log.timestamp).toLocaleString('pt-BR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${log.user_name || 'Sistema'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${log.action}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${log.resource_type || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${log.ip_address || '-'}
            </td>
        </tr>
    `).join('');
}

// Carregar alertas
async function loadAlerts() {
    try {
        const response = await apiRequest('/admin/alerts');
        
        if (response.success) {
            document.getElementById('alerts-count').textContent = response.data.alerts.filter(a => !a.is_resolved).length;
        }
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
    }
}

// Função para excluir usuário
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const response = await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            alert('Usuário excluído com sucesso!');
            loadDashboard(); // Recarregar dados
        } else {
            alert('Erro ao excluir usuário: ' + response.error);
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}

// Função para editar usuário
function editUser(userId) {
    alert('Funcionalidade de edição será implementada em breve');
}

// Função para abrir modal de novo usuário
function openUserModal() {
    document.getElementById('userModal').classList.remove('hidden');
}

// Função para fechar modal de usuário
function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    document.getElementById('userForm').reset();
}

// Função para submeter formulário de usuário
async function submitUserForm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        plan: formData.get('plan') || 'free'
    };

    try {
        const response = await apiRequest('/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response.success) {
            alert('Usuário criado com sucesso!');
            closeUserModal();
            loadDashboard(); // Recarregar dados
        } else {
            alert('Erro ao criar usuário: ' + response.error);
        }
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        alert('Erro ao criar usuário: ' + error.message);
    }
}

// Função para mostrar tabs
function showTab(tabName) {
    // Esconder todos os conteúdos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remover classe active de todos os botões
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active', 'border-indigo-500', 'text-indigo-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Mostrar conteúdo selecionado
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Ativar botão selecionado
    const activeButton = document.getElementById(`tab-${tabName}`);
    activeButton.classList.add('active', 'border-indigo-500', 'text-indigo-600');
    activeButton.classList.remove('border-transparent', 'text-gray-500');
    
    // Carregar dados específicos da tab
    switch (tabName) {
        case 'users':
            loadUsers();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'logs':
            loadAuditLogs();
            break;
        case 'reports':
            loadReports();
            break;
        case 'support':
            loadSupportTickets();
            break;
    }
}

// Carregar usuários
async function loadUsers() {
    try {
        const response = await apiRequest('/admin/users?limit=100');
        
        if (response.success) {
            updateUsersTable(response.data.users);
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Carregar pagamentos (placeholder)
function loadPayments() {
    const tbody = document.getElementById('payments-table');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Sistema de pagamentos será implementado em breve</td></tr>';
}

// Carregar relatórios (placeholder)
function loadReports() {
    console.log('Carregando relatórios...');
}

// Carregar tickets de suporte (placeholder)
function loadSupportTickets() {
    const tbody = document.getElementById('support-table');
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Sistema de suporte será implementado em breve</td></tr>';
}

// Auto-refresh dos dados a cada 30 segundos
setInterval(() => {
    if (authToken && currentUser) {
        loadDashboard();
    }
}, 30000);

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Funções para modais de confirmação
function openConfirmModal(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmButton').onclick = () => {
        callback();
        closeConfirmModal();
    };
    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}