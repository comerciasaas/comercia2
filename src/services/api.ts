const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          window.location.href = '/login';
          throw new Error('Sessão expirada');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.success && data.data?.token) {
      this.token = data.data.token;
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  }

  async register(userData: any): Promise<ApiResponse> {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (data.success && data.data?.token) {
      this.token = data.data.token;
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  }

  async getProfile(): Promise<ApiResponse> {
    return this.request('/auth/profile');
  }

  async updateProfile(userData: any): Promise<ApiResponse> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Agent methods
  async getAgents(): Promise<ApiResponse> {
    return this.request('/agents');
  }

  async createAgent(agentData: any): Promise<ApiResponse> {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(agentData),
    });
  }

  async updateAgent(id: string, agentData: any): Promise<ApiResponse> {
    return this.request(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(agentData),
    });
  }

  async deleteAgent(id: string): Promise<ApiResponse> {
    return this.request(`/agents/${id}`, {
      method: 'DELETE',
    });
  }

  async getAgentStats(): Promise<ApiResponse> {
    return this.request('/agents/stats');
  }

  // Conversation methods
  async getConversations(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/conversations?${queryParams}`);
  }

  async getConversation(id: string): Promise<ApiResponse> {
    return this.request(`/conversations/${id}`);
  }

  async createConversation(conversationData: any): Promise<ApiResponse> {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(conversationData),
    });
  }

  async getConversationStats(): Promise<ApiResponse> {
    return this.request('/conversations/stats');
  }

  // Admin methods (apenas para admins)
  async getDashboardStats(): Promise<ApiResponse> {
    return this.request('/admin/dashboard');
  }

  async getAllUsers(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/users?${queryParams}`);
  }

  async createUser(userData: any): Promise<ApiResponse> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getAllAgents(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/agents?${queryParams}`);
  }

  async getAllConversations(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/conversations?${queryParams}`);
  }

  async getAuditLogs(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/audit-logs?${queryParams}`);
  }

  async getAlerts(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/alerts?${queryParams}`);
  }

  async resolveAlert(id: string): Promise<ApiResponse> {
    return this.request(`/admin/alerts/${id}/resolve`, {
      method: 'PUT',
    });
  }

  async getSystemHealth(): Promise<ApiResponse> {
    return this.request('/admin/system/health');
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export const apiService = new ApiService();