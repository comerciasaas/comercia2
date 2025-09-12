// Admin Panel JavaScript
const API_BASE_URL = 'http://localhost:3001/api';
let authToken = null;

// Check if admin is already logged in
function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        authToken = token;
        showDashboard();
        loadDashboardData();
    } else {
        showLoginForm();
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('flex');
    document.getElementById('dashboard').classList.add('hidden');
    document.querySelector('header').classList.add('hidden');
}

// Show dashboard
function showDashboard() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('flex');
    document.getElementById('dashboard').classList.remove('hidden');
    document.querySelector('header').classList.remove('hidden');
}

// Admin login
async function adminLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    // Check for demo admin credentials
    if (email === 'admin@test.com' && password === 'admin123') {
        authToken = 'admin-demo-token';
        localStorage.setItem('admin_token', authToken);
        document.getElementById('admin-name').textContent = 'Admin Demo';
        showDashboard();
        loadDashboardData();
        return;
    }
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        });
        
        if (response.data.success && response.data.user.role === 'admin') {
            authToken = response.data.token;
            localStorage.setItem('admin_token', authToken);
            document.getElementById('admin-name').textContent = response.data.user.name;
            showDashboard();
            loadDashboardData();
        } else {
            alert('Acesso negado. Apenas administradores podem acessar este painel.');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro no login. Verifique suas credenciais.');
    }
}

// Logout
function logout() {
    localStorage.removeItem('admin_token');
    authToken = null;
    showLoginForm();
}

// Load dashboard data
async function loadDashboardData() {
    if (!authToken) return;
    
    try {
        if (authToken === 'admin-demo-token') {
            // Mock data for testing
            const mockStats = {
                overview: {
                    totalUsers: 127,
                    activeAgents: 45,
                    totalConversations: 1834,
                    unresolvedAlerts: 3
                }
            };
            
            document.getElementById('total-users').textContent = mockStats.overview.totalUsers;
            document.getElementById('active-agents').textContent = mockStats.overview.activeAgents;
            document.getElementById('conversations-today').textContent = mockStats.overview.totalConversations;
            document.getElementById('alerts-count').textContent = mockStats.overview.unresolvedAlerts;
            
            // Mock users data
            const mockUsers = [
                {
                    id: 1,
                    name: 'João Silva',
                    email: 'joao@test.com',
                    plan: 'Pro',
                    status: 'Ativo',
                    created_at: new Date('2024-01-15'),
                    last_login: new Date('2024-01-20')
                },
                {
                    id: 2,
                    name: 'Maria Santos',
                    email: 'maria@demo.com',
                    plan: 'Basic',
                    status: 'Ativo',
                    created_at: new Date('2024-01-10'),
                    last_login: new Date('2024-01-19')
                },
                {
                    id: 3,
                    name: 'Pedro Costa',
                    email: 'pedro@empresa.com',
                    plan: 'Enterprise',
                    status: 'Inativo',
                    created_at: new Date('2024-01-05'),
                    last_login: new Date('2024-01-18')
                }
            ];
            
            displayUsers(mockUsers);
            return;
        }
        
        // Load dashboard stats
        const statsResponse = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (statsResponse.data.success) {
            const stats = statsResponse.data.stats;
            document.getElementById('total-users').textContent = stats.overview?.totalUsers || 0;
            document.getElementById('active-agents').textContent = stats.overview?.activeAgents || 0;
            document.getElementById('conversations-today').textContent = stats.overview?.totalConversations || 0;
            document.getElementById('alerts-count').textContent = stats.overview?.unresolvedAlerts || 0;
        }
        
        // Load users
        const usersResponse = await axios.get(`${API_BASE_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (usersResponse.data.success) {
            displayUsers(usersResponse.data.data.users);
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            logout();
        }
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }">
                    ${user.role === 'admin' ? 'Administrador' : 'Cliente'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(user.created_at).toLocaleDateString('pt-BR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                ${user.role !== 'admin' ? `<button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900">Excluir</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Edit user (placeholder)
function editUser(userId) {
    alert(`Funcionalidade de edição do usuário ${userId} será implementada em breve.`);
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
        const response = await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Usuário excluído com sucesso!');
            loadDashboardData(); // Reload data
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário.');
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
});

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active', 'border-indigo-500', 'text-indigo-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(`content-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
    }
    
    // Add active class to selected tab button
    const selectedButton = document.getElementById(`tab-${tabName}`);
    if (selectedButton) {
        selectedButton.classList.add('active', 'border-indigo-500', 'text-indigo-600');
        selectedButton.classList.remove('border-transparent', 'text-gray-500');
    }
    
    // Load data for specific tabs
    switch(tabName) {
        case 'overview':
            loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'logs':
            loadLogsData();
            break;
        case 'support':
            loadSupportData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// Load Settings Data
async function loadSettingsData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/settings`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            displaySettingsData(response.data.data);
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        // Load default settings
        displaySettingsData({
            general: {
                site_name: 'SaaS Agente IA',
                site_description: 'Plataforma de Agentes de IA para WhatsApp',
                timezone: 'America/Sao_Paulo',
                language: 'pt-BR',
                maintenance_mode: false
            },
            integrations: {
                whatsapp_api_url: '',
                whatsapp_token: '',
                stripe_public_key: '',
                stripe_secret_key: '',
                openai_api_key: '',
                smtp_host: '',
                smtp_port: 587,
                smtp_user: '',
                smtp_password: ''
            },
            email_templates: {
                welcome_email: {
                    subject: 'Bem-vindo ao SaaS Agente IA',
                    body: 'Olá {{name}}, bem-vindo à nossa plataforma!'
                },
                password_reset: {
                    subject: 'Redefinição de Senha',
                    body: 'Clique no link para redefinir sua senha: {{reset_link}}'
                },
                invoice_email: {
                    subject: 'Nova Fatura - {{invoice_number}}',
                    body: 'Sua fatura no valor de {{amount}} está disponível.'
                }
            }
        });
    }
}

function displaySettingsData(data) {
    // General Settings
    if (data.general) {
        const siteNameEl = document.getElementById('site_name');
        const siteDescEl = document.getElementById('site_description');
        const timezoneEl = document.getElementById('timezone');
        const languageEl = document.getElementById('language');
        const maintenanceEl = document.getElementById('maintenance_mode');
        
        if (siteNameEl) siteNameEl.value = data.general.site_name || '';
        if (siteDescEl) siteDescEl.value = data.general.site_description || '';
        if (timezoneEl) timezoneEl.value = data.general.timezone || 'America/Sao_Paulo';
        if (languageEl) languageEl.value = data.general.language || 'pt-BR';
        if (maintenanceEl) maintenanceEl.checked = data.general.maintenance_mode || false;
    }
    
    // Integration Settings
    if (data.integrations) {
        const whatsappUrlEl = document.getElementById('whatsapp_api_url');
        const whatsappTokenEl = document.getElementById('whatsapp_token');
        const stripePublicEl = document.getElementById('stripe_public_key');
        const stripeSecretEl = document.getElementById('stripe_secret_key');
        const openaiKeyEl = document.getElementById('openai_api_key');
        const smtpHostEl = document.getElementById('smtp_host');
        const smtpPortEl = document.getElementById('smtp_port');
        const smtpUserEl = document.getElementById('smtp_user');
        const smtpPasswordEl = document.getElementById('smtp_password');
        
        if (whatsappUrlEl) whatsappUrlEl.value = data.integrations.whatsapp_api_url || '';
        if (whatsappTokenEl) whatsappTokenEl.value = data.integrations.whatsapp_token || '';
        if (stripePublicEl) stripePublicEl.value = data.integrations.stripe_public_key || '';
        if (stripeSecretEl) stripeSecretEl.value = data.integrations.stripe_secret_key || '';
        if (openaiKeyEl) openaiKeyEl.value = data.integrations.openai_api_key || '';
        if (smtpHostEl) smtpHostEl.value = data.integrations.smtp_host || '';
        if (smtpPortEl) smtpPortEl.value = data.integrations.smtp_port || 587;
        if (smtpUserEl) smtpUserEl.value = data.integrations.smtp_user || '';
        if (smtpPasswordEl) smtpPasswordEl.value = data.integrations.smtp_password || '';
    }
    
    // Email Templates
    if (data.email_templates) {
        // Welcome Email
        if (data.email_templates.welcome_email) {
            const welcomeSubjectEl = document.getElementById('welcome_subject');
            const welcomeBodyEl = document.getElementById('welcome_body');
            if (welcomeSubjectEl) welcomeSubjectEl.value = data.email_templates.welcome_email.subject || '';
            if (welcomeBodyEl) welcomeBodyEl.value = data.email_templates.welcome_email.body || '';
        }
        
        // Password Reset
        if (data.email_templates.password_reset) {
            const resetSubjectEl = document.getElementById('reset_subject');
            const resetBodyEl = document.getElementById('reset_body');
            if (resetSubjectEl) resetSubjectEl.value = data.email_templates.password_reset.subject || '';
            if (resetBodyEl) resetBodyEl.value = data.email_templates.password_reset.body || '';
        }
        
        // Invoice Email
        if (data.email_templates.invoice_email) {
            const invoiceSubjectEl = document.getElementById('invoice_subject');
            const invoiceBodyEl = document.getElementById('invoice_body');
            if (invoiceSubjectEl) invoiceSubjectEl.value = data.email_templates.invoice_email.subject || '';
            if (invoiceBodyEl) invoiceBodyEl.value = data.email_templates.invoice_email.body || '';
        }
    }
}

// Save settings functions
async function saveGeneralSettings() {
    const formData = {
        site_name: document.getElementById('site_name')?.value || '',
        site_description: document.getElementById('site_description')?.value || '',
        timezone: document.getElementById('timezone')?.value || 'America/Sao_Paulo',
        language: document.getElementById('language')?.value || 'pt-BR',
        maintenance_mode: document.getElementById('maintenance_mode')?.checked || false
    };
    
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/settings/general`, formData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Configurações gerais salvas com sucesso!');
        } else {
            alert('Erro ao salvar configurações: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao salvar configurações gerais:', error);
        alert('Erro ao salvar configurações: ' + (error.response?.data?.message || error.message));
    }
}

async function saveIntegrationSettings() {
    const formData = {
        whatsapp_api_url: document.getElementById('whatsapp_api_url')?.value || '',
        whatsapp_token: document.getElementById('whatsapp_token')?.value || '',
        stripe_public_key: document.getElementById('stripe_public_key')?.value || '',
        stripe_secret_key: document.getElementById('stripe_secret_key')?.value || '',
        openai_api_key: document.getElementById('openai_api_key')?.value || '',
        smtp_host: document.getElementById('smtp_host')?.value || '',
        smtp_port: parseInt(document.getElementById('smtp_port')?.value) || 587,
        smtp_user: document.getElementById('smtp_user')?.value || '',
        smtp_password: document.getElementById('smtp_password')?.value || ''
    };
    
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/settings/integrations`, formData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Configurações de integração salvas com sucesso!');
        } else {
            alert('Erro ao salvar configurações: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao salvar configurações de integração:', error);
        alert('Erro ao salvar configurações: ' + (error.response?.data?.message || error.message));
    }
}

async function saveEmailTemplates() {
    const formData = {
        welcome_email: {
            subject: document.getElementById('welcome_subject')?.value || '',
            body: document.getElementById('welcome_body')?.value || ''
        },
        password_reset: {
            subject: document.getElementById('reset_subject')?.value || '',
            body: document.getElementById('reset_body')?.value || ''
        },
        invoice_email: {
            subject: document.getElementById('invoice_subject')?.value || '',
            body: document.getElementById('invoice_body')?.value || ''
        }
    };
    
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/settings/email-templates`, formData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Templates de email salvos com sucesso!');
        } else {
            alert('Erro ao salvar templates: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao salvar templates de email:', error);
        alert('Erro ao salvar templates: ' + (error.response?.data?.message || error.message));
    }
}

// Test integration functions
async function testWhatsAppConnection() {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/settings/test/whatsapp`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Conexão com WhatsApp testada com sucesso!');
        } else {
            alert('Erro na conexão: ' + (response.data.message || 'Teste falhou'));
        }
    } catch (error) {
        console.error('Erro ao testar WhatsApp:', error);
        alert('Erro no teste: ' + (error.response?.data?.message || error.message));
    }
}

async function testEmailConnection() {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/settings/test/email`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Conexão de email testada com sucesso!');
        } else {
            alert('Erro na conexão: ' + (response.data.message || 'Teste falhou'));
        }
    } catch (error) {
        console.error('Erro ao testar email:', error);
        alert('Erro no teste: ' + (error.response?.data?.message || error.message));
    }
}

// Make functions globally available
window.saveGeneralSettings = saveGeneralSettings;
window.saveIntegrationSettings = saveIntegrationSettings;
window.saveEmailTemplates = saveEmailTemplates;
window.testWhatsAppConnection = testWhatsAppConnection;
window.testEmailConnection = testEmailConnection

// Load Users Data
async function loadUsersData() {
    if (!authToken) return;
    
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            displayUsersTable(response.data.data.users);
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Display Users in Enhanced Table
function displayUsersTable(users) {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }">
                    ${user.role === 'admin' ? 'Administrador' : 'Cliente'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Ativo
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(user.created_at).toLocaleDateString('pt-BR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                <button onclick="resetPassword(${user.id})" class="text-yellow-600 hover:text-yellow-900 mr-3">Reset Senha</button>
                ${user.role !== 'admin' ? `<button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900">Excluir</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load Payments Data
async function loadPaymentsData() {
    if (!authToken) return;
    
    // Check for demo token
    if (authToken === 'admin-demo-token') {
        const mockData = {
            plans: [
                { id: 1, name: 'Básico', price_per_month: 29.90, active_subscriptions: 45, monthly_revenue: 1345.50 },
                { id: 2, name: 'Profissional', price_per_month: 79.90, active_subscriptions: 23, monthly_revenue: 1837.70 },
                { id: 3, name: 'Enterprise', price_per_month: 199.90, active_subscriptions: 8, monthly_revenue: 1599.20 }
            ],
            subscriptions: [
                { id: 1, user_name: 'João Silva', plan_name: 'Profissional', status: 'active', next_billing: '2024-02-15' },
                { id: 2, user_name: 'Maria Santos', plan_name: 'Básico', status: 'active', next_billing: '2024-02-20' },
                { id: 3, user_name: 'Pedro Costa', plan_name: 'Enterprise', status: 'cancelled', next_billing: null }
            ],
            payments: [
                { id: 1, user_name: 'João Silva', amount: 79.90, status: 'completed', date: '2024-01-15', method: 'credit_card' },
                { id: 2, user_name: 'Maria Santos', amount: 29.90, status: 'completed', date: '2024-01-20', method: 'pix' },
                { id: 3, user_name: 'Ana Lima', amount: 199.90, status: 'pending', date: '2024-01-25', method: 'bank_transfer' }
            ],
            invoices: [
                { id: 1, user_name: 'João Silva', amount: 79.90, status: 'paid', due_date: '2024-02-15', issued_date: '2024-01-15' },
                { id: 2, user_name: 'Carlos Oliveira', amount: 29.90, status: 'overdue', due_date: '2024-01-30', issued_date: '2024-01-01' },
                { id: 3, user_name: 'Fernanda Rocha', amount: 199.90, status: 'sent', due_date: '2024-02-10', issued_date: '2024-01-10' }
            ]
        };
        
        displayPaymentsData(mockData);
        return;
    }
    
    try {
        const [plansResponse, subscriptionsResponse, paymentsResponse, invoicesResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/admin/plans`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/subscriptions`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/payments`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/invoices`, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
        ]);
        
        if (plansResponse.data.success && subscriptionsResponse.data.success && paymentsResponse.data.success && invoicesResponse.data.success) {
            displayPaymentsData({
                plans: plansResponse.data.data.plans,
                subscriptions: subscriptionsResponse.data.data.subscriptions,
                payments: paymentsResponse.data.data.payments,
                invoices: invoicesResponse.data.data.invoices
            });
        }
        
    } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
        displayPaymentsTable([]);
        
        // Update revenue display
        document.getElementById('monthly-revenue-display').textContent = 'R$ 2.450,00';
    }
}

// Display Payments Data
function displayPaymentsData(data) {
    // Update plans table
    const plansTableBody = document.querySelector('#plans-table');
    if (plansTableBody && data.plans) {
        plansTableBody.innerHTML = '';
        data.plans.forEach(plan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${plan.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ ${parseFloat(plan.price_per_month).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${plan.active_subscriptions || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ ${parseFloat(plan.monthly_revenue || 0).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editPlan(${plan.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                    <button onclick="deletePlan(${plan.id})" class="text-red-600 hover:text-red-900">Excluir</button>
                </td>
            `;
            plansTableBody.appendChild(row);
        });
    }
    
    // Update payments history table
    const paymentsTableBody = document.querySelector('#payments-table');
    if (paymentsTableBody && data.payments) {
        paymentsTableBody.innerHTML = '';
        data.payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${payment.user_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${payment.plan_name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ ${parseFloat(payment.amount).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusClass(payment.status)}">
                        ${payment.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(payment.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewPaymentDetails(${payment.id})" class="text-indigo-600 hover:text-indigo-900">Ver</button>
                </td>
            `;
            paymentsTableBody.appendChild(row);
        });
    }
    
    // Update invoices table
    const invoicesTableBody = document.querySelector('#invoices-table');
    if (invoicesTableBody && data.invoices) {
        invoicesTableBody.innerHTML = '';
        data.invoices.forEach(invoice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${invoice.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invoice.user_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ ${parseFloat(invoice.amount).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInvoiceStatusClass(invoice.status)}">
                        ${invoice.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(invoice.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="sendInvoice(${invoice.id})" class="text-green-600 hover:text-green-900 mr-3" ${invoice.status === 'sent' ? 'disabled' : ''}>Enviar</button>
                    <button onclick="viewInvoice(${invoice.id})" class="text-indigo-600 hover:text-indigo-900">Ver</button>
                </td>
            `;
            invoicesTableBody.appendChild(row);
        });
    }
}

// Display Payments Table
function displayPaymentsTable(payments) {
    const tbody = document.getElementById('payments-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${payment.user}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${payment.plan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${payment.amount}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    payment.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }">
                    ${payment.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${payment.date.toLocaleDateString('pt-BR')}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getPaymentStatusClass(status) {
    switch (status) {
        case 'completed': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'failed': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getInvoiceStatusClass(status) {
    switch (status) {
        case 'paid': return 'bg-green-100 text-green-800';
        case 'sent': return 'bg-blue-100 text-blue-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Plan management functions
function editPlan(planId) {
    alert(`Funcionalidade de edição do plano ${planId} será implementada em breve.`);
}

async function deletePlan(planId) {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
        const response = await axios.delete(`${API_BASE_URL}/admin/plans/${planId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Plano excluído com sucesso!');
            loadPaymentsData();
        } else {
            alert('Erro ao excluir plano: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao excluir plano:', error);
        alert('Erro ao excluir plano: ' + (error.response?.data?.message || error.message));
    }
}

function viewPaymentDetails(paymentId) {
    alert(`Visualizar detalhes do pagamento ${paymentId}`);
}

async function sendInvoice(invoiceId) {
    if (!confirm('Enviar fatura por email?')) return;
    
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/invoices/${invoiceId}/send`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Fatura enviada com sucesso!');
            loadPaymentsData();
        } else {
            alert('Erro ao enviar fatura: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao enviar fatura:', error);
        alert('Erro ao enviar fatura: ' + (error.response?.data?.message || error.message));
    }
}

function viewInvoice(invoiceId) {
    alert(`Visualizar fatura ${invoiceId}`);
}

// Load Logs Data
async function loadLogsData() {
    if (!authToken) return;
    
    // Check for demo token
    if (authToken === 'admin-demo-token') {
        const mockData = {
            audit: [
                { id: 1, user_name: 'João Silva', action: 'user_login', description: 'Login realizado com sucesso', created_at: '2024-01-25T10:30:00Z', ip_address: '192.168.1.100' },
                { id: 2, user_name: 'Admin Demo', action: 'user_created', description: 'Novo usuário criado: Maria Santos', created_at: '2024-01-25T09:15:00Z', ip_address: '192.168.1.1' },
                { id: 3, user_name: 'Pedro Costa', action: 'agent_configured', description: 'Agente de atendimento configurado', created_at: '2024-01-25T08:45:00Z', ip_address: '192.168.1.50' }
            ],
            system: [
                { id: 1, level: 'info', message: 'Sistema iniciado com sucesso', created_at: '2024-01-25T00:00:00Z', component: 'server' },
                { id: 2, level: 'warning', message: 'Alto uso de CPU detectado (85%)', created_at: '2024-01-25T10:20:00Z', component: 'monitor' },
                { id: 3, level: 'error', message: 'Falha na conexão com provedor de IA', created_at: '2024-01-25T09:30:00Z', component: 'ai_service' }
            ],
            security: [
                { id: 1, event_type: 'login_success', user_name: 'João Silva', ip_address: '192.168.1.100', created_at: '2024-01-25T10:30:00Z', details: 'Login bem-sucedido' },
                { id: 2, event_type: 'failed_login', user_name: 'unknown', ip_address: '203.0.113.1', created_at: '2024-01-25T09:45:00Z', details: 'Tentativa de login com credenciais inválidas' },
                { id: 3, event_type: 'password_changed', user_name: 'Maria Santos', ip_address: '192.168.1.75', created_at: '2024-01-25T08:20:00Z', details: 'Senha alterada pelo usuário' }
            ]
        };
        
        displayLogsData(mockData);
        return;
    }
    
    try {
        const [auditLogsResponse, systemLogsResponse, securityLogsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/admin/logs/audit`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/logs/system`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/logs/security`, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
        ]);
        
        if (auditLogsResponse.data.success && systemLogsResponse.data.success && securityLogsResponse.data.success) {
            displayLogsData({
                audit: auditLogsResponse.data.data.logs,
                system: systemLogsResponse.data.data.logs,
                security: securityLogsResponse.data.data.logs
            });
        }
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        displayLogsData({
            audit: [],
            system: [],
            security: []
        });
    }
}

function displayLogsData(data) {
    // Display Audit Logs
    const auditTableBody = document.querySelector('#audit-logs-table');
    if (auditTableBody && data.audit) {
        auditTableBody.innerHTML = '';
        data.audit.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(log.created_at).toLocaleString('pt-BR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${log.user_name || 'Sistema'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionClass(log.action)}">
                        ${getActionLabel(log.action)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.resource || 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${log.details || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.ip_address || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewLogDetails(${log.id}, 'audit')" class="text-indigo-600 hover:text-indigo-900">
                        Ver
                    </button>
                </td>
            `;
            auditTableBody.appendChild(row);
        });
    }
    
    // Display System Logs
    const systemTableBody = document.querySelector('#system-logs-table');
    if (systemTableBody && data.system) {
        systemTableBody.innerHTML = '';
        data.system.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(log.created_at).toLocaleString('pt-BR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLogLevelClass(log.level)}">
                        ${log.level.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.module || 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${log.message}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewLogDetails(${log.id}, 'system')" class="text-indigo-600 hover:text-indigo-900">
                        Ver
                    </button>
                </td>
            `;
            systemTableBody.appendChild(row);
        });
    }
    
    // Display Security Logs
    const securityTableBody = document.querySelector('#security-logs-table');
    if (securityTableBody && data.security) {
        securityTableBody.innerHTML = '';
        data.security.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(log.created_at).toLocaleString('pt-BR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSecurityEventClass(log.event_type)}">
                        ${getSecurityEventLabel(log.event_type)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${log.user_name || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${log.ip_address || 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${log.details || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewLogDetails(${log.id}, 'security')" class="text-indigo-600 hover:text-indigo-900">
                        Ver
                    </button>
                </td>
            `;
            securityTableBody.appendChild(row);
        });
    }
}

// Helper functions for log display
function getActionClass(action) {
    switch (action) {
        case 'user_created':
        case 'agent_created':
            return 'bg-green-100 text-green-800';
        case 'user_updated':
        case 'agent_updated':
            return 'bg-blue-100 text-blue-800';
        case 'user_deleted':
        case 'agent_deleted':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getActionLabel(action) {
    const labels = {
        'user_created': 'Usuário Criado',
        'user_updated': 'Usuário Atualizado',
        'user_deleted': 'Usuário Excluído',
        'agent_created': 'Agente Criado',
        'agent_updated': 'Agente Atualizado',
        'agent_deleted': 'Agente Excluído',
        'login': 'Login',
        'logout': 'Logout'
    };
    return labels[action] || action;
}

function getLogLevelClass(level) {
    switch (level) {
        case 'error':
            return 'bg-red-100 text-red-800';
        case 'warning':
            return 'bg-yellow-100 text-yellow-800';
        case 'info':
            return 'bg-blue-100 text-blue-800';
        case 'debug':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getSecurityEventClass(eventType) {
    switch (eventType) {
        case 'login_success':
            return 'bg-green-100 text-green-800';
        case 'login_failed':
        case 'unauthorized_access':
            return 'bg-red-100 text-red-800';
        case 'password_reset':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getSecurityEventLabel(eventType) {
    const labels = {
        'login_success': 'Login Sucesso',
        'login_failed': 'Login Falhou',
        'logout': 'Logout',
        'password_reset': 'Reset Senha',
        'unauthorized_access': 'Acesso Negado'
    };
    return labels[eventType] || eventType;
}

// Log management functions
function viewLogDetails(logId, logType) {
    alert(`Visualizar detalhes do log ${logId} (${logType})`);
}

async function exportLogs(logType, format = 'csv') {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/logs/export/${logType}?format=${format}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'blob'
        });
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${logType}_logs_${new Date().toISOString().split('T')[0]}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        alert('Logs exportados com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar logs:', error);
        alert('Erro ao exportar logs: ' + (error.response?.data?.message || error.message));
    }
}

async function clearLogs(logType) {
    if (!confirm(`Tem certeza que deseja limpar todos os logs de ${logType}? Esta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        const response = await axios.delete(`${API_BASE_URL}/admin/logs/${logType}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Logs limpos com sucesso!');
            loadLogsData();
        } else {
            alert('Erro ao limpar logs: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        alert('Erro ao limpar logs: ' + (error.response?.data?.message || error.message));
    }
}

// Make functions globally available
window.viewLogDetails = viewLogDetails;
window.exportLogs = exportLogs;
window.clearLogs = clearLogs;

// Display Logs Table (legacy function for backward compatibility)
function displayLogsTable(logs) {
    const tbody = document.getElementById('logs-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(log.timestamp).toLocaleString('pt-BR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${log.user}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.action}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.resource}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.ip}</td>
        `;
        tbody.appendChild(row);
    });
}

// Load Support Data
async function loadSupportData() {
    // Check for demo token
    if (authToken === 'admin-demo-token') {
        const mockTickets = [
            { id: 1, user_name: 'João Silva', subject: 'Problema com integração WhatsApp', status: 'open', priority: 'high', category: 'technical', created_at: '2024-01-25T10:30:00Z', last_response: '2024-01-25T11:15:00Z' },
            { id: 2, user_name: 'Maria Santos', subject: 'Dúvida sobre planos de pagamento', status: 'pending', priority: 'medium', category: 'billing', created_at: '2024-01-25T09:20:00Z', last_response: '2024-01-25T09:45:00Z' },
            { id: 3, user_name: 'Pedro Costa', subject: 'Solicitação de nova funcionalidade', status: 'closed', priority: 'low', category: 'feature_request', created_at: '2024-01-24T14:10:00Z', last_response: '2024-01-25T08:30:00Z' },
            { id: 4, user_name: 'Ana Lima', subject: 'Erro ao configurar agente IA', status: 'in_progress', priority: 'high', category: 'technical', created_at: '2024-01-25T08:00:00Z', last_response: '2024-01-25T10:00:00Z' }
        ];
        
        displaySupportTable(mockTickets);
        return;
    }
    
    try {
        const response = await fetch('/api/admin/support', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const tickets = await response.json();
            displaySupportTable(tickets);
        } else {
            throw new Error('Falha ao carregar tickets de suporte');
        }
    } catch (error) {
        console.error('Erro ao carregar tickets de suporte:', error);
        displaySupportTable([]);
    }
}

// Display Support Table
function displaySupportTable(tickets) {
    const tbody = document.getElementById('support-table');
    tbody.innerHTML = '';
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${ticket.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${ticket.user}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${ticket.subject}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    ticket.status === 'Aberto' ? 'bg-red-100 text-red-800' : 
                    ticket.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }">
                    ${ticket.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    ticket.priority === 'Alta' ? 'bg-red-100 text-red-800' : 
                    ticket.priority === 'Média' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }">
                    ${ticket.priority}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${ticket.date.toLocaleDateString('pt-BR')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewTicket(${ticket.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">Ver</button>
                <button onclick="respondTicket(${ticket.id})" class="text-green-600 hover:text-green-900">Responder</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// User Management Functions
function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('userForm');
    
    // Reset form
    form.reset();
    document.getElementById('userId').value = '';
    
    if (userId) {
        // Edit mode
        modalTitle.textContent = 'Editar Usuário';
        loadUserData(userId);
    } else {
        // Create mode
        modalTitle.textContent = 'Criar Novo Usuário';
        document.getElementById('userPassword').required = true;
    }
    
    modal.classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

async function loadUserData(userId) {
    if (!authToken) return;
    
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            const user = response.data.data;
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userRole').value = user.role;
            document.getElementById('userPlan').value = user.plan || 'free';
            document.getElementById('userPassword').required = false;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        alert('Erro ao carregar dados do usuário');
    }
}

async function submitUserForm(event) {
    event.preventDefault();
    
    if (!authToken) return;
    
    const formData = new FormData(event.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role'),
        plan: formData.get('plan')
    };
    
    // Only include password if provided
    const password = formData.get('password');
    if (password) {
        userData.password = password;
    }
    
    const userId = formData.get('userId');
    const isEdit = userId && userId !== '';
    
    try {
        let response;
        if (isEdit) {
            response = await axios.put(`${API_BASE_URL}/admin/users/${userId}`, userData, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
        } else {
            response = await axios.post(`${API_BASE_URL}/admin/users`, userData, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
        }
        
        if (response.data.success) {
            alert(isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
            closeUserModal();
            loadUsersData(); // Refresh users list
        } else {
            alert('Erro: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert('Erro ao salvar usuário: ' + (error.response?.data?.message || error.message));
    }
}

function editUser(userId) {
    openUserModal(userId);
}

function resetPassword(userId) {
    showConfirmModal(
        'Reset de Senha',
        'Tem certeza que deseja resetar a senha deste usuário? Uma nova senha será enviada por email.',
        () => performResetPassword(userId)
    );
}

async function performResetPassword(userId) {
    if (!authToken) return;
    
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Senha resetada com sucesso! Nova senha enviada por email.');
        } else {
            alert('Erro ao resetar senha: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        alert('Erro ao resetar senha: ' + (error.response?.data?.message || error.message));
    }
    
    closeConfirmModal();
}

function deleteUser(userId) {
    showConfirmModal(
        'Excluir Usuário',
        'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
        () => performDeleteUser(userId)
    );
}

async function performDeleteUser(userId) {
    if (!authToken) return;
    
    try {
        const response = await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Usuário excluído com sucesso!');
            loadUsersData(); // Refresh users list
        } else {
            alert('Erro ao excluir usuário: ' + (response.data.message || 'Operação falhou'));
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + (error.response?.data?.message || error.message));
    }
    
    closeConfirmModal();
}

// Confirmation Modal Functions
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmButton').onclick = onConfirm;
    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}

// Support Functions
function viewTicket(ticketId) {
    alert(`Visualizar ticket #${ticketId}`);
}

function respondTicket(ticketId) {
    alert(`Responder ticket #${ticketId}`);
}

// Load Reports Data
async function loadReportsData() {
    // Check for demo token
    if (authToken === 'admin-demo-token') {
        const mockReportsData = {
            users: {
                totalUsers: 127,
                newUsersThisMonth: 23,
                activeUsers: 89,
                userGrowth: 18.5,
                usersByPlan: [
                    { plan: 'Básico', count: 65, percentage: 51.2 },
                    { plan: 'Profissional', count: 45, percentage: 35.4 },
                    { plan: 'Enterprise', count: 17, percentage: 13.4 }
                ]
            },
            revenue: {
                totalRevenue: 8750.50,
                monthlyRecurring: 6420.30,
                revenueGrowth: 12.8,
                averageRevenuePerUser: 68.90,
                revenueByMonth: [
                    { month: 'Jan', revenue: 7200 },
                    { month: 'Fev', revenue: 7850 },
                    { month: 'Mar', revenue: 8750 }
                ]
            },
            agents: {
                totalAgents: 45,
                activeAgents: 38,
                averageResponseTime: 2.3,
                satisfactionRate: 94.2,
                topPerformers: [
                    { name: 'Agente Vendas Pro', conversations: 156, rating: 4.8 },
                    { name: 'Suporte Técnico IA', conversations: 134, rating: 4.7 },
                    { name: 'Atendimento Geral', conversations: 98, rating: 4.6 }
                ]
            },
            performance: {
                systemUptime: 99.8,
                averageLoadTime: 1.2,
                errorRate: 0.3,
                apiCalls: 12450,
                performanceMetrics: [
                    { metric: 'CPU Usage', value: 45, status: 'good' },
                    { metric: 'Memory Usage', value: 67, status: 'warning' },
                    { metric: 'Disk Usage', value: 23, status: 'good' }
                ]
            }
        };
        
        displayReportsData(mockReportsData);
        return;
    }
    
    try {
        const [usersReport, revenueReport, agentsReport, performanceReport] = await Promise.all([
            axios.get(`${API_BASE_URL}/admin/reports/users`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/reports/revenue`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/reports/agents`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/reports/performance`, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
        ]);
        
        if (usersReport.data.success && revenueReport.data.success && agentsReport.data.success && performanceReport.data.success) {
            displayReportsData({
                users: usersReport.data.data,
                revenue: revenueReport.data.data,
                agents: agentsReport.data.data,
                performance: performanceReport.data.data
            });
        }
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        displayReportsData({
            users: {
                total_users: 1250,
                new_users_this_month: 85,
                active_users: 980,
                user_growth: 12.5,
                user_retention: 78.3,
                demographics: {
                    age_groups: [
                        { range: '18-25', count: 312, percentage: 25 },
                        { range: '26-35', count: 437, percentage: 35 },
                        { range: '36-45', count: 375, percentage: 30 },
                        { range: '46+', count: 126, percentage: 10 }
                    ],
                    locations: [
                        { country: 'Brasil', count: 850, percentage: 68 },
                        { country: 'Argentina', count: 200, percentage: 16 },
                        { country: 'México', count: 125, percentage: 10 },
                        { country: 'Outros', count: 75, percentage: 6 }
                    ]
                }
            },
            revenue: {
                total_revenue: 125000,
                monthly_revenue: 15600,
                revenue_growth: 18.7,
                average_revenue_per_user: 127.50,
                subscription_breakdown: [
                    { plan: 'Básico', revenue: 45000, subscribers: 750, percentage: 36 },
                    { plan: 'Premium', revenue: 62000, subscribers: 400, percentage: 49.6 },
                    { plan: 'Enterprise', revenue: 18000, subscribers: 100, percentage: 14.4 }
                ],
                monthly_trends: [
                    { month: 'Jan', revenue: 12000 },
                    { month: 'Fev', revenue: 13200 },
                    { month: 'Mar', revenue: 14100 },
                    { month: 'Abr', revenue: 15600 },
                    { month: 'Mai', revenue: 16800 },
                    { month: 'Jun', revenue: 15600 }
                ]
            },
            agents: {
                total_agents: 450,
                active_agents: 380,
                agent_performance: {
                    top_performers: [
                        { name: 'Agente Vendas Pro', conversations: 1250, conversion_rate: 85.2 },
                        { name: 'Agente Suporte 24h', conversations: 980, conversion_rate: 78.9 },
                        { name: 'Agente Marketing', conversations: 750, conversion_rate: 72.1 }
                    ],
                    average_response_time: 2.3,
                    satisfaction_score: 4.6
                },
                usage_stats: {
                    daily_conversations: 2850,
                    weekly_conversations: 18500,
                    monthly_conversations: 75000
                }
            },
            performance: {
                system_uptime: 99.8,
                average_response_time: 145,
                error_rate: 0.2,
                database_performance: {
                    query_time: 85,
                    connection_pool: 78,
                    cache_hit_rate: 94.5
                },
                server_metrics: {
                    cpu_usage: 45,
                    memory_usage: 62,
                    disk_usage: 38,
                    network_io: 125
                }
            }
        });
    }
}

function displayReportsData(data) {
    // Display Users Report
    if (data.users) {
        updateReportCard('total-users-card', data.users.total_users, 'Usuários Totais');
        updateReportCard('new-users-card', data.users.new_users_this_month, 'Novos Usuários (Mês)');
        updateReportCard('active-users-card', data.users.active_users, 'Usuários Ativos');
        updateReportCard('user-growth-card', `${data.users.user_growth}%`, 'Crescimento');
        
        // Age Demographics Chart
        if (data.users.demographics && data.users.demographics.age_groups) {
            createDoughnutChart('age-demographics-chart', {
                labels: data.users.demographics.age_groups.map(group => group.range),
                data: data.users.demographics.age_groups.map(group => group.count),
                title: 'Distribuição por Idade'
            });
        }
        
        // Location Demographics Chart
        if (data.users.demographics && data.users.demographics.locations) {
            createBarChart('location-demographics-chart', {
                labels: data.users.demographics.locations.map(loc => loc.country),
                data: data.users.demographics.locations.map(loc => loc.count),
                title: 'Usuários por Localização'
            });
        }
    }
    
    // Display Revenue Report
    if (data.revenue) {
        updateReportCard('total-revenue-card', `R$ ${data.revenue.total_revenue.toLocaleString()}`, 'Receita Total');
        updateReportCard('monthly-revenue-card', `R$ ${data.revenue.monthly_revenue.toLocaleString()}`, 'Receita Mensal');
        updateReportCard('revenue-growth-card', `${data.revenue.revenue_growth}%`, 'Crescimento');
        updateReportCard('arpu-card', `R$ ${data.revenue.average_revenue_per_user}`, 'ARPU');
        
        // Revenue Trends Chart
        if (data.revenue.monthly_trends) {
            createLineChart('revenue-trends-chart', {
                labels: data.revenue.monthly_trends.map(trend => trend.month),
                data: data.revenue.monthly_trends.map(trend => trend.revenue),
                title: 'Tendência de Receita'
            });
        }
        
        // Subscription Breakdown Chart
        if (data.revenue.subscription_breakdown) {
            createDoughnutChart('subscription-breakdown-chart', {
                labels: data.revenue.subscription_breakdown.map(sub => sub.plan),
                data: data.revenue.subscription_breakdown.map(sub => sub.revenue),
                title: 'Receita por Plano'
            });
        }
    }
    
    // Display Agents Report
    if (data.agents) {
        updateReportCard('total-agents-card', data.agents.total_agents, 'Agentes Totais');
        updateReportCard('active-agents-card', data.agents.active_agents, 'Agentes Ativos');
        updateReportCard('avg-response-time-card', `${data.agents.agent_performance.average_response_time}s`, 'Tempo Resposta');
        updateReportCard('satisfaction-score-card', data.agents.agent_performance.satisfaction_score, 'Satisfação');
        
        // Top Performers Table
        if (data.agents.agent_performance && data.agents.agent_performance.top_performers) {
            displayTopPerformersTable(data.agents.agent_performance.top_performers);
        }
        
        // Usage Stats Chart
        if (data.agents.usage_stats) {
            createBarChart('agent-usage-chart', {
                labels: ['Diário', 'Semanal', 'Mensal'],
                data: [
                    data.agents.usage_stats.daily_conversations,
                    data.agents.usage_stats.weekly_conversations,
                    data.agents.usage_stats.monthly_conversations
                ],
                title: 'Conversas por Período'
            });
        }
    }
    
    // Display Performance Report
    if (data.performance) {
        updateReportCard('system-uptime-card', `${data.performance.system_uptime}%`, 'Uptime');
        updateReportCard('response-time-card', `${data.performance.average_response_time}ms`, 'Tempo Resposta');
        updateReportCard('error-rate-card', `${data.performance.error_rate}%`, 'Taxa de Erro');
        updateReportCard('cache-hit-rate-card', `${data.performance.database_performance.cache_hit_rate}%`, 'Cache Hit Rate');
        
        // Server Metrics Chart
        if (data.performance.server_metrics) {
            createRadarChart('server-metrics-chart', {
                labels: ['CPU', 'Memória', 'Disco', 'Rede'],
                data: [
                    data.performance.server_metrics.cpu_usage,
                    data.performance.server_metrics.memory_usage,
                    data.performance.server_metrics.disk_usage,
                    data.performance.server_metrics.network_io
                ],
                title: 'Métricas do Servidor'
            });
        }
    }
}

// Helper functions for reports
function updateReportCard(cardId, value, label) {
    const card = document.getElementById(cardId);
    if (card) {
        const valueElement = card.querySelector('.report-value');
        const labelElement = card.querySelector('.report-label');
        
        if (valueElement) valueElement.textContent = value;
        if (labelElement) labelElement.textContent = label;
    }
}

function displayTopPerformersTable(performers) {
    const tableBody = document.querySelector('#top-performers-table');
    if (tableBody) {
        tableBody.innerHTML = '';
        performers.forEach((performer, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${index + 1}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${performer.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${performer.conversations.toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${performer.conversion_rate}%
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// Chart creation functions
function createLineChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.title,
                data: config.data,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: config.title
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createBarChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.title,
                data: config.data,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: config.title
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createDoughnutChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: config.labels,
            datasets: [{
                data: config.data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: config.title
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createRadarChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.title,
                data: config.data,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgb(59, 130, 246)',
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(59, 130, 246)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: config.title
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Export functions
async function exportReport(reportType, format = 'pdf') {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/reports/export/${reportType}?format=${format}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'blob'
        });
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        alert('Relatório exportado com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        alert('Erro ao exportar relatório: ' + (error.response?.data?.message || error.message));
    }
}

// Make functions globally available
window.loadReportsData = loadReportsData;
window.exportReport = exportReport;

// Load Support Data
async function loadSupportData() {
    try {
        const [ticketsResponse, supportStatsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/admin/support/tickets`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${API_BASE_URL}/admin/support/stats`, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
        ]);
        
        if (ticketsResponse.data.success && supportStatsResponse.data.success) {
            displaySupportData({
                tickets: ticketsResponse.data.data,
                stats: supportStatsResponse.data.data
            });
        }
    } catch (error) {
        console.error('Erro ao carregar dados de suporte:', error);
        displaySupportData({
            tickets: [],
            stats: {}
        });
    }
}

function displaySupportData(data) {
    // Display support stats
    if (data.stats) {
        updateSupportCard('total-tickets-card', data.stats.total_tickets, 'Total de Tickets');
        updateSupportCard('open-tickets-card', data.stats.open_tickets, 'Tickets Abertos');
        updateSupportCard('avg-response-time-card', `${data.stats.average_response_time}h`, 'Tempo Médio Resposta');
        updateSupportCard('satisfaction-card', data.stats.customer_satisfaction, 'Satisfação');
    }
    
    // Display tickets table
    if (data.tickets) {
        displayTicketsTable(data.tickets);
    }
}

function updateSupportCard(cardId, value, label) {
    const card = document.getElementById(cardId);
    if (card) {
        const valueElement = card.querySelector('.support-value');
        const labelElement = card.querySelector('.support-label');
        
        if (valueElement) valueElement.textContent = value;
        if (labelElement) labelElement.textContent = label;
    }
}

function displayTicketsTable(tickets) {
    const tableBody = document.querySelector('#tickets-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const createdDate = new Date(ticket.created_at).toLocaleDateString('pt-BR');
        const updatedDate = new Date(ticket.updated_at).toLocaleDateString('pt-BR');
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                #${ticket.id}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
                <div class="font-medium">${ticket.subject}</div>
                <div class="text-gray-500">${ticket.user_name} (${ticket.user_email})</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(ticket.status)}">
                    ${getStatusLabel(ticket.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityClass(ticket.priority)}">
                    ${getPriorityLabel(ticket.priority)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${getCategoryLabel(ticket.category)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${ticket.messages_count}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>${createdDate}</div>
                <div class="text-xs text-gray-400">Atualizado: ${updatedDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="viewTicketDetails(${ticket.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                    Ver
                </button>
                <button onclick="respondToTicket(${ticket.id})" class="text-green-600 hover:text-green-900 mr-3">
                    Responder
                </button>
                <button onclick="closeTicket(${ticket.id})" class="text-red-600 hover:text-red-900">
                    Fechar
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Helper functions for support
function getStatusClass(status) {
    switch (status) {
        case 'open': return 'bg-red-100 text-red-800';
        case 'in_progress': return 'bg-yellow-100 text-yellow-800';
        case 'resolved': return 'bg-green-100 text-green-800';
        case 'closed': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'open': return 'Aberto';
        case 'in_progress': return 'Em Andamento';
        case 'resolved': return 'Resolvido';
        case 'closed': return 'Fechado';
        default: return 'Desconhecido';
    }
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'high': return 'bg-red-100 text-red-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getPriorityLabel(priority) {
    switch (priority) {
        case 'high': return 'Alta';
        case 'medium': return 'Média';
        case 'low': return 'Baixa';
        default: return 'Normal';
    }
}

function getCategoryLabel(category) {
    switch (category) {
        case 'technical': return 'Técnico';
        case 'billing': return 'Faturamento';
        case 'support': return 'Suporte';
        case 'feature_request': return 'Novo Recurso';
        default: return 'Geral';
    }
}

// Support management functions
async function viewTicketDetails(ticketId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/support/tickets/${ticketId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            // Show ticket details modal
            showTicketDetailsModal(response.data.data);
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes do ticket:', error);
        alert('Erro ao carregar detalhes do ticket: ' + (error.response?.data?.message || error.message));
    }
}

async function respondToTicket(ticketId) {
    const response = prompt('Digite sua resposta:');
    if (!response) return;
    
    try {
        const result = await axios.post(`${API_BASE_URL}/admin/support/tickets/${ticketId}/respond`, {
            message: response
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (result.data.success) {
            alert('Resposta enviada com sucesso!');
            loadSupportData(); // Reload data
        }
    } catch (error) {
        console.error('Erro ao responder ticket:', error);
        alert('Erro ao responder ticket: ' + (error.response?.data?.message || error.message));
    }
}

async function closeTicket(ticketId) {
    if (!confirm('Tem certeza que deseja fechar este ticket?')) return;
    
    try {
        const response = await axios.patch(`${API_BASE_URL}/admin/support/tickets/${ticketId}/close`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            alert('Ticket fechado com sucesso!');
            loadSupportData(); // Reload data
        }
    } catch (error) {
        console.error('Erro ao fechar ticket:', error);
        alert('Erro ao fechar ticket: ' + (error.response?.data?.message || error.message));
    }
}

function showTicketDetailsModal(ticket) {
    // Mock implementation - would show a modal with full ticket details
    alert(`Detalhes do Ticket #${ticket.id}\n\nAssunto: ${ticket.subject}\nUsuário: ${ticket.user_name}\nStatus: ${getStatusLabel(ticket.status)}\nPrioridade: ${getPriorityLabel(ticket.priority)}\nCategoria: ${getCategoryLabel(ticket.category)}`);
}

// Make support functions globally available
window.loadSupportData = loadSupportData;
window.viewTicketDetails = viewTicketDetails;
window.respondToTicket = respondToTicket;
window.closeTicket = closeTicket;

// Auto-refresh data every 30 seconds
setInterval(() => {
    if (authToken && document.getElementById('dashboard').style.display !== 'none') {
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            const tabName = activeTab.id.replace('tab-', '');
            showTab(tabName);
        }
    }
}, 30000);

// Initialize with overview tab
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    // Set overview as default tab when dashboard loads
    setTimeout(() => {
        if (authToken) {
            showTab('overview');
        }
    }, 100);
});