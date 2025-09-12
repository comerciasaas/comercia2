const API_BASE_URL = '/api';

class ApiService {
  private token: string | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private getCacheKey(url: string, options: RequestInit = {}): string {
    return `${url}_${JSON.stringify(options)}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cacheKey = this.getCacheKey(url, options);
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
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
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Cache GET requests
      if (!options.method || options.method === 'GET') {
        const cacheKey = this.getCacheKey(url, options);
        this.setCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  }

  async register(userData: any) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(userData: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Agent methods
  async getAgents() {
    return this.request('/agents');
  }

  async createAgent(agentData: any) {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(agentData),
    });
  }

  async updateAgent(id: string, agentData: any) {
    return this.request(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(agentData),
    });
  }

  async deleteAgent(id: string) {
    return this.request(`/agents/${id}`, {
      method: 'DELETE',
    });
  }

  async getAgentStats() {
    return this.request('/agents/stats');
  }

  // Conversation methods
  async getConversations(filters: any = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/conversations?${queryParams}`);
  }

  async getConversation(id: string) {
    return this.request(`/conversations/${id}`);
  }

  async createConversation(conversationData: any) {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(conversationData),
    });
  }

  async updateConversation(id: string, conversationData: any) {
    return this.request(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(conversationData),
    });
  }

  // Admin methods
  async getDashboardStats() {
    return this.request('/admin/dashboard');
  }

  async getAllUsers(filters: any = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/users?${queryParams}`);
  }

  async createUser(userData: any) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getAllAgents(filters: any = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/agents?${queryParams}`);
  }

  async getAllConversations(filters: any = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/conversations?${queryParams}`);
  }

  async getAlerts(filters: any = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/alerts?${queryParams}`);
  }

  async resolveAlert(id: string) {
    return this.request(`/admin/alerts/${id}/resolve`, {
      method: 'PUT',
    });
  }

  async getAuditLogs(filters: any = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });
    
    return this.request(`/admin/audit-logs?${queryParams}`);
  }

  async getSystemHealth() {
    return this.request('/admin/system/health');
  }

  // WhatsApp methods
  async getWhatsAppStats() {
    return this.request('/whatsapp/stats');
  }

  async getWhatsAppSessions() {
    return this.request('/whatsapp/sessions');
  }

  async getActiveSessions() {
    return this.request('/whatsapp/sessions/active');
  }

  async getStaleSessions() {
    return this.request('/whatsapp/sessions/stale');
  }

  async assignAgent(sessionId: string, agentId: string) {
    return this.request('/whatsapp/sessions/assign', {
      method: 'POST',
      body: JSON.stringify({ sessionId, agentId }),
    });
  }

  async transferSession(sessionId: string, fromAgentId: string, toAgentId: string, reason?: string) {
    return this.request('/whatsapp/sessions/transfer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, fromAgentId, toAgentId, reason }),
    });
  }

  async closeSession(sessionId: string, reason?: string) {
    return this.request('/whatsapp/sessions/close', {
      method: 'POST',
      body: JSON.stringify({ sessionId, reason }),
    });
  }

  async sendWhatsAppMessage(sessionId: string, message: string, messageType: string = 'text') {
    return this.request('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, messageType }),
    });
  }

  async getConversationHistory(sessionId: string, page: number = 1, limit: number = 50) {
    return this.request(`/whatsapp/conversations/${sessionId}?page=${page}&limit=${limit}`);
  }

  async getPerformanceReport(agentId?: string, startDate?: string, endDate?: string) {
    const queryParams = new URLSearchParams();
    if (agentId) queryParams.append('agentId', agentId);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    return this.request(`/whatsapp/reports/performance?${queryParams}`);
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